import type { ComponentType } from "react";
import type { MarketDealing } from "@/lib/markets/types";
import type { PriceFormat } from "@/components/position-card";
import type { MarketSession } from "@/lib/market-status";
import type { HolidaySource } from "@/lib/bank-holidays";
import type { MarketStatusView } from "./market-anchor-card";

import {
  LiveWash,
  MarketAnchorCard,
  MarketAnchorPanel,
  useMarketStatusView,
} from "./market-anchor-card";
import { compareDealingImportance } from "./market-utils";

import { CompanyLogo } from "@/components/company-logo";
import { RatingBadge } from "@/components/rating-badge";
import { Skeleton } from "@/components/skeleton";

export interface RecentBestEntry<W> {
  dealing: MarketDealing<W>;
  returnPct: number | null;
}

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
  /** Trading session for the market — drives the anchor card pinned at
   *  the top of the section. */
  session?: MarketSession;
  /** Exchange-holiday source so the anchor card can show "Closed for X"
   *  on bank holidays and skip them when computing the next open day. */
  holidays?: HolidaySource;
  /** Past-week best-performing filings, pre-sorted by return %. Surfaced
   *  next to the anchor on empty days as the "Best this week" grid so
   *  weekends/holidays don't leave the page blank. */
  recentBest?: RecentBestEntry<W>[];
  /** True once the live-prices fetch has settled. Until then the gainers
   *  grid renders skeleton cells — the underlying entries arrive sorted
   *  by value when prices are missing and then re-sort by gain as soon
   *  as prices land, so rendering them eagerly produces a visible jump. */
  recentBestReady?: boolean;
}

/** Mobile: a horizontal snap carousel that peeks the next card; lg+: a
 *  tidy two/three-up grid. Shared by the live cards AND the loading
 *  skeleton so the layout doesn't jump when data lands. */
const TODAY_CAROUSEL_CLASS =
  "flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-2 lg:gap-4 lg:overflow-visible lg:pb-0 2xl:grid-cols-3";
/** One card slot inside the carousel — fixed-width + peek on mobile, auto
 *  in the lg+ grid. */
const TODAY_CARD_SLOT_CLASS = "w-[72%] shrink-0 snap-start lg:w-auto lg:shrink";

/** Today surface — section heading, then either today's deal cards
 *  (busy day) or the anchor + best-this-week side-by-side (empty day).
 *  Mobile stacks everything; lg+ splits the empty-day view 50/50. */
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
  recentBest,
  recentBestReady,
}: MarketTodayHeroProps<W>) {
  const { title: todayTitle, meta: todayMeta } = formatToday(todayIso, locale);
  const sortedDealings = [...todayDealings].sort(compareDealingImportance);
  // The hero surfaces the day's analysed/primary filings as cards. Skipped
  // (muted) filings render as ordinary rows under a "Today" group in the
  // table below — a long tail of low-signal tranches reads better as table
  // rows than as a grid of cards — so they're intentionally absent here.
  const mainDealings = sortedDealings.filter((d) =>
    isMuted ? !isMuted(d) : d.isPurchase,
  );
  const BEST_GRID_CAP = 6;
  const countLabel =
    todayDealings.length === 0
      ? ""
      : todayDealings.length === 1
        ? "1 filing"
        : `${todayDealings.length} filings`;

  const view = useMarketStatusView(session, holidaySource);
  const bestEntries = (recentBest ?? []).slice(0, BEST_GRID_CAP);
  // Full-day closures (weekend, bank holiday) make the "Today · SATURDAY"
  // header read as filler — the anchor card carries the date context.
  // Suppress on those days regardless of whether late filings landed
  // (Sweden's regulator publishes on Saturdays); keep it for live /
  // pre-open / after-hours when the framing is still meaningful.
  const hideTodayHeader =
    view?.closureKind === "weekend" || view?.closureKind === "holiday";

  return (
    <section className="relative z-10">
      {!hideTodayHeader && (
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
      )}

      {todayDealings.length > 0 ? (
        <>
          {/* Mobile: snap carousel so a busy day doesn't push the table
              1800px down the page — peek the next card at the right edge to
              signal swipe. lg+: spreads to a tidy two/three-up grid. The
              market-status anchor rides along as the first card (pinned
              ahead of the deals) rather than a full-width banner — so once
              there's at least one deal, "Scanning the market" is just one
              card in the row. */}
          <div className={TODAY_CAROUSEL_CLASS}>
            {view && (
              <div className={TODAY_CARD_SLOT_CLASS}>
                <div
                  className="animate-today-hero-item h-full"
                  style={{ animationDelay: todayHeroDelay(1) }}
                >
                  <MarketAnchorCard view={view} />
                </div>
              </div>
            )}
            {mainDealings.map((d, index) => (
              <div key={d.key} className={TODAY_CARD_SLOT_CLASS}>
                <TodayCard
                  animationDelay={todayHeroDelay(index + 2)}
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
        </>
      ) : loading ? (
        <div className={TODAY_CAROUSEL_CLASS}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className={`${TODAY_CARD_SLOT_CLASS} animate-today-hero-item`}
              style={{ animationDelay: todayHeroDelay(i + 1) }}
            >
              <TodayCardSkeleton />
            </div>
          ))}
        </div>
      ) : view ? (
        <EmptyDayContainer
          bestEntries={bestEntries}
          bestReady={recentBestReady ?? true}
          fmt={fmt}
          formatTickerDisplay={formatTickerDisplay}
          selectedKey={selectedKey}
          showLogo={showLogo}
          view={view}
          onSelect={onSelect}
        />
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
      className={`group h-full w-full animate-today-hero-item rounded-xl border bg-[#faf7f2] p-4 text-left transition-colors duration-150 dark:bg-surface md:p-5
        ${
          selected
            ? "border-[#5a4128]/40 bg-[#5a4128]/[0.04] dark:border-[#ad9479]/40 dark:bg-[#5a4128]/[0.18]"
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
                className="shrink-0 !h-[20px] !w-auto !rounded-full !px-2 !py-0 !text-[10px] !leading-none"
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

/** Empty-day surface — one shared rounded container holding the anchor
 *  panel on the left and the "Biggest gainers" grid on the right. A 1px
 *  gap-px lattice paints the dividers, so there's no internal border
 *  chrome and both halves stretch to the same height. Stacks on mobile. */
function EmptyDayContainer<W>({
  view,
  bestEntries,
  bestReady,
  fmt,
  formatTickerDisplay,
  selectedKey,
  showLogo,
  onSelect,
}: {
  view: MarketStatusView;
  bestEntries: RecentBestEntry<W>[];
  bestReady: boolean;
  fmt: PriceFormat;
  formatTickerDisplay?: (ticker: string) => string;
  selectedKey?: string | null;
  showLogo: boolean;
  onSelect: (d: MarketDealing<W>) => void;
}) {
  const showGrid = bestReady ? bestEntries.length > 0 : true;

  return (
    <div
      className="animate-today-hero-item overflow-hidden rounded-xl border border-black/[0.08] bg-black/[0.08] dark:border-white/[0.08] dark:bg-white/[0.08]"
      style={{ animationDelay: todayHeroDelay(1) }}
    >
      <div
        className={`grid gap-px ${showGrid ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}
      >
        <div
          className={`relative flex flex-col p-6 md:p-8 ${
            view.isLive
              ? "bg-[#2E7D32]/[0.06] dark:bg-[#2E7D32]/[0.15]"
              : "bg-[#faf7f2] dark:bg-surface"
          }`}
        >
          {view.isLive && <LiveWash />}
          <MarketAnchorPanel view={view} />
        </div>
        {showGrid && (
          <div className="flex min-w-0 flex-col bg-[#faf7f2] dark:bg-surface">
            <div className="flex items-center justify-between px-4 pt-4 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
              <span>Biggest gainers · last 30 days</span>
              <span className="font-normal normal-case tracking-normal text-muted/70">
                Return since trade
              </span>
            </div>
            <div className="grid flex-1 grid-cols-2 gap-px bg-black/[0.06] dark:bg-white/[0.06]">
              {bestReady
                ? bestEntries.map((entry) => (
                    <BestThisWeekCell
                      key={entry.dealing.key}
                      entry={entry}
                      fmt={fmt}
                      formatTickerDisplay={formatTickerDisplay}
                      selected={selectedKey === entry.dealing.key}
                      showLogo={showLogo}
                      onSelect={() => onSelect(entry.dealing)}
                    />
                  ))
                : Array.from({ length: 6 }).map((_, i) => (
                    <BestThisWeekCellSkeleton key={i} showLogo={showLogo} />
                  ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BestThisWeekCell<W>({
  entry,
  selected,
  onSelect,
  fmt,
  showLogo,
  formatTickerDisplay,
}: {
  entry: RecentBestEntry<W>;
  selected: boolean;
  onSelect: () => void;
  fmt: PriceFormat;
  showLogo: boolean;
  formatTickerDisplay?: (ticker: string) => string;
}) {
  const { dealing, returnPct } = entry;
  const tickerLabel = formatTickerDisplay
    ? formatTickerDisplay(dealing.ticker || "—")
    : dealing.ticker || "—";
  const valueLabel =
    dealing.value != null ? fmt.formatValue(dealing.value) : null;
  const returnLabel =
    returnPct != null
      ? `${returnPct >= 0 ? "+" : ""}${returnPct.toFixed(1)}%`
      : null;
  const returnTone =
    returnPct == null
      ? "text-muted"
      : returnPct >= 0
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-rose-600 dark:text-rose-400";

  return (
    <button
      className={`group flex items-center gap-3 p-3 text-left transition-colors ${
        selected
          ? "bg-[#5a4128]/[0.06] dark:bg-[#5a4128]/[0.20]"
          : "bg-[#faf7f2] hover:bg-[#f1ebe2] dark:bg-surface dark:hover:bg-surface-secondary"
      }`}
      onClick={onSelect}
    >
      {showLogo ? (
        <CompanyLogo
          className="ring-1 ring-black/[0.04] dark:ring-white/[0.05] shrink-0"
          size={32}
          ticker={dealing.ticker || ""}
        />
      ) : (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e8e0d5] font-mono text-[10px] font-semibold text-muted dark:bg-surface-secondary">
          {tickerLabel.slice(0, 3)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[13px] font-medium leading-tight tracking-[-0.02em]">
            {dealing.company || "—"}
          </span>
          <span
            className={`shrink-0 text-[13px] font-semibold tabular-nums ${returnTone}`}
          >
            {returnLabel ?? valueLabel ?? "—"}
          </span>
        </div>
        <div className="mt-0.5 flex items-baseline justify-between gap-2 text-[11px] text-muted">
          <span className="truncate font-mono">{tickerLabel}</span>
          {returnLabel && valueLabel && (
            <span className="shrink-0 tabular-nums">{valueLabel}</span>
          )}
        </div>
      </div>
    </button>
  );
}

function BestThisWeekCellSkeleton({ showLogo }: { showLogo: boolean }) {
  return (
    <div className="flex items-center gap-3 bg-[#faf7f2] p-3 dark:bg-surface">
      {showLogo ? (
        <Skeleton circle h={32} w={32} />
      ) : (
        <Skeleton circle h={32} w={32} />
      )}
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-3 w-10 rounded" />
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <Skeleton className="h-2.5 w-12 rounded" />
          <Skeleton className="h-2.5 w-14 rounded" />
        </div>
      </div>
    </div>
  );
}

function TodayCardSkeleton() {
  return (
    <div className="h-full rounded-xl border border-black/[0.08] bg-[#faf7f2] p-4 dark:border-white/[0.08] dark:bg-surface md:p-5">
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

/** Stagger delays for the Today hero cascade — header first, then anchor,
 *  then cards. */
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
