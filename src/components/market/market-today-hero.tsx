import type { ComponentType } from "react";
import type { MarketDealing } from "@/lib/markets/types";
import type { PriceFormat } from "@/components/position-card";
import type { MarketSession } from "@/lib/market-status";
import type { HolidaySource } from "@/lib/bank-holidays";
import type { MarketStatusView } from "./market-anchor-card";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import {
  LiveWash,
  MarketAnchorPanel,
  useMarketStatusView,
} from "./market-anchor-card";
import { compareDealingImportance } from "./market-utils";

import { CompanyLogo } from "@/components/company-logo";
import { useMediaQuery } from "@/lib/use-media-query";
import { RatingBadge } from "@/components/rating-badge";
import { Skeleton } from "@/components/skeleton";
import { CommentCountChip } from "@/components/comment-count-chip";
import { ViewAnalysisCta } from "@/components/discretion/view-analysis-cta";
import { commentCountFor } from "@/lib/comment-counts";
import { DISCRETION_ENABLED } from "@/lib/discretion";

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

/** Desktop grid for Today's deals. Mobile uses the pinned scroll-through deck. */
const TODAY_GRID_CLASS =
  "hidden lg:grid lg:grid-cols-2 lg:gap-4 2xl:grid-cols-3";

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
  const dateLabel = formatTodayDate(todayIso, locale);
  const sortedDealings = [...todayDealings].sort(compareDealingImportance);
  // The hero surfaces the day's analysed/primary filings as cards. Skipped
  // (muted) filings render as ordinary rows under a "Today" group in the
  // table below — a long tail of low-signal tranches reads better as table
  // rows than as a grid of cards — so they're intentionally absent here.
  const mainDealings = sortedDealings.filter((d) =>
    isMuted ? !isMuted(d) : d.isPurchase,
  );
  const BEST_GRID_CAP = 6;
  const view = useMarketStatusView(session, holidaySource);
  const bestEntries = (recentBest ?? []).slice(0, BEST_GRID_CAP);
  const isBusyDay = todayDealings.length > 0;
  // Full-day closures (weekend, bank holiday) with nothing to show make the
  // header read as filler — suppress it then. A closed day that still has
  // filings (Sweden publishes Saturdays) keeps the header.
  const hideTodayHeader =
    !isBusyDay &&
    !loading &&
    (view?.closureKind === "weekend" || view?.closureKind === "holiday");

  return (
    <section className="relative z-10">
      {/* On busy mobile days the heading is pinned *inside* the deck (so it
          stays as context while the cards shuffle) — hide this flow copy
          there to avoid a duplicate. Desktop + empty/loading keep it here. */}
      {!hideTodayHeader && (
        <header
          className={`mb-4 md:mb-5 ${isBusyDay || loading ? "hidden lg:block" : ""}`}
        >
          <TodayHeading animate dateLabel={dateLabel} />
        </header>
      )}

      {todayDealings.length > 0 ? (
        <>
          {/* Mobile: page-scroll narrative deck. The hero pins while the user
              scrolls through each filing, then releases once the last card
              has passed. Desktop remains a static grid. */}
          <MobilePinnedTodayDeck
            dateLabel={dateLabel}
            dealings={mainDealings}
            fmt={fmt}
            formatTickerDisplay={formatTickerDisplay}
            selectedKey={selectedKey}
            showLogo={showLogo}
            onSelect={onSelect}
          />
          <div className={TODAY_GRID_CLASS}>
            {mainDealings.map((d, index) => (
              <TodayCard
                key={d.key}
                animationDelay={todayHeroDelay(index + 1)}
                dealing={d}
                fmt={fmt}
                formatTickerDisplay={formatTickerDisplay}
                isMuted={isMuted}
                selected={selectedKey === d.key}
                showLogo={showLogo}
                onSelect={() => onSelect(d)}
              />
            ))}
          </div>
        </>
      ) : loading ? (
        <>
          <MobilePinnedTodayDeckSkeleton />
          <div className={TODAY_GRID_CLASS}>
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
        </>
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
        <div className="rounded-xl border border-black/[0.08] bg-sheet px-6 py-10 text-center text-sm text-muted dark:border-white/[0.08] dark:bg-surface">
          No filings disclosed today yet.
        </div>
      )}
    </section>
  );
}

/** "Today's deals · 17 June" — shared by the flow header (desktop / empty
 *  days, with the entrance animation) and the deck's pinned header (static,
 *  so it doesn't fight the scroll transforms). */
function TodayHeading({
  dateLabel,
  animate = false,
}: {
  dateLabel: string;
  animate?: boolean;
}) {
  return (
    <h2
      className={`text-[19px] font-semibold leading-tight tracking-[-0.025em] md:text-[22px] ${animate ? "animate-today-hero-item" : ""}`}
      style={animate ? { animationDelay: todayHeroDelay(0) } : undefined}
    >
      Today&rsquo;s deals
      {dateLabel && (
        <span className="font-normal text-muted"> · {dateLabel}</span>
      )}
    </h2>
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
  const insiderBits = [tickerLabel, dealing.insiderRole, dealing.insiderName]
    .filter(Boolean)
    .join(" · ");

  return (
    <button
      className={`group h-full w-full animate-today-hero-item rounded-xl border bg-sheet p-4 text-left transition-colors duration-150 dark:bg-surface md:p-5
        ${
          selected
            ? "border-brand-brown/40 bg-brand-brown/[0.04] dark:border-brand-tan/40 dark:bg-brand-brown/[0.18]"
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
            size={56}
            ticker={dealing.ticker || ""}
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-hairline font-mono text-sm font-semibold text-muted dark:bg-surface-secondary">
            {tickerLabel.slice(0, 3)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 truncate text-[18px] font-semibold leading-tight tracking-[-0.03em]">
              {dealing.company || "—"}
            </h3>
            {DISCRETION_ENABLED ? (
              <ViewAnalysisCta className="shrink-0" />
            ) : (
              dealing.rating && (
                <RatingBadge
                  className="shrink-0 !h-[20px] !w-auto !rounded-full !px-2 !py-0 !text-[10px] !leading-none"
                  rating={dealing.rating}
                />
              )
            )}
          </div>
          <div className="mt-1 truncate text-[12px] text-muted">
            {insiderBits}
          </div>
          {commentCountFor(dealing) > 0 && (
            <div className="mt-2">
              <CommentCountChip count={commentCountFor(dealing)} />
            </div>
          )}
          <div className="mt-3 text-[22px] font-semibold tabular-nums leading-none tracking-[-0.04em]">
            {valueLabel}
          </div>
        </div>
      </div>
      {/* The summary is the thesis preview — kept off the teaser surface under
          discretion so the analysis (rating + reasoning) stays an app-only draw. */}
      {!DISCRETION_ENABLED && dealing.summary && (
        <p className="mt-4 text-[13px] leading-relaxed text-foreground/55 dark:text-foreground/60">
          {dealing.summary}
        </p>
      )}
    </button>
  );
}

/** The big, full-bleed card the mobile wallet deck flips through — one
 *  filing in focus at a time, so it goes large and technical: a tag row up
 *  top (rating lives here now, not crammed beside the name), the full
 *  un-truncated company name, the headline value, the complete thesis, and
 *  a monospaced stat grid pinned to the bottom. Fills its parent's height
 *  (the deck stage is sized to the viewport) so there's no dead space. */
function TodayDeckCard<W>({
  dealing,
  selected,
  onSelect,
  fmt,
  showLogo,
  formatTickerDisplay,
}: {
  dealing: MarketDealing<W>;
  selected: boolean;
  onSelect: () => void;
  fmt: PriceFormat;
  showLogo: boolean;
  formatTickerDisplay?: (ticker: string) => string;
}) {
  const tickerLabel = formatTickerDisplay
    ? formatTickerDisplay(dealing.ticker || "—")
    : dealing.ticker || "—";
  const valueLabel =
    dealing.value != null ? fmt.formatValue(dealing.value) : "—";
  const insiderBits = [dealing.insiderRole, dealing.insiderName]
    .filter(Boolean)
    .join(" · ");

  const ret = dealing.livePerformance?.return_pct_trade ?? null;
  const returnLabel =
    ret != null ? `${ret >= 0 ? "+" : ""}${ret.toFixed(1)}%` : null;
  const returnTone =
    ret == null
      ? ""
      : ret >= 0
        ? "text-positive"
        : "text-rose-600 dark:text-rose-400";

  // Factual, non-analysis stats — safe to show even under discretion. The
  // rating/thesis (analysis) stay gated below. Capped to two tidy rows;
  // sector already shows in the eyebrow so it's left out here.
  const stats: { label: string; value: string; tone?: string }[] = [];

  if (dealing.shares)
    stats.push({ label: "Shares", value: dealing.shares.toLocaleString() });
  if (dealing.entryPrice != null)
    stats.push({ label: "Entry", value: fmt.formatPrice(dealing.entryPrice) });
  if (returnLabel)
    stats.push({ label: "Return", value: returnLabel, tone: returnTone });
  stats.push({ label: "Traded", value: formatStatDate(dealing.tradeDate) });
  stats.push({
    label: "Disclosed",
    value: formatStatDate(dealing.disclosedDate),
  });
  if (dealing.legCount > 1)
    stats.push({ label: "Tranches", value: String(dealing.legCount) });
  else if (dealing.catalystWindow)
    stats.push({ label: "Catalyst", value: dealing.catalystWindow });

  const shownStats = stats.slice(0, 6);

  return (
    <button
      className={`group flex w-full flex-col overflow-hidden rounded-[20px] border bg-sheet p-5 text-left shadow-[0_18px_44px_-16px_rgba(30,21,6,0.26)] transition-colors duration-150 dark:bg-surface md:p-6
        ${
          selected
            ? "border-brand-brown/40 bg-brand-brown/[0.04] dark:border-brand-tan/40 dark:bg-brand-brown/[0.18]"
            : "border-black/[0.08] dark:border-white/[0.08]"
        }`}
      onClick={onSelect}
    >
      {/* Tag row — ticker + sector eyebrow on the left, rating on the right.
          Moving the rating up here frees the name to use the full width. */}
      <div className="flex items-center justify-between gap-3">
        <span className="truncate font-mono text-[12px] font-semibold uppercase tracking-[0.12em] text-muted">
          {tickerLabel}
          {dealing.sector ? ` · ${dealing.sector}` : ""}
        </span>
        {DISCRETION_ENABLED ? (
          <ViewAnalysisCta className="shrink-0" />
        ) : (
          dealing.rating && (
            <RatingBadge
              className="shrink-0 !h-[22px] !w-auto !rounded-full !px-2.5 !py-0 !text-[11px] !leading-none"
              rating={dealing.rating}
            />
          )
        )}
      </div>

      {/* Identity */}
      <div className="mt-3.5 flex items-start gap-3.5">
        {showLogo ? (
          <CompanyLogo
            className="ring-1 ring-black/[0.04] dark:ring-white/[0.05] shrink-0"
            size={80}
            ticker={dealing.ticker || ""}
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-hairline font-mono text-lg font-semibold text-muted dark:bg-surface-secondary">
            {tickerLabel.slice(0, 3)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-[27px] font-semibold leading-[1.05] tracking-[-0.03em]">
            {dealing.company || "—"}
          </h3>
          {insiderBits && (
            <div className="mt-1 text-[12.5px] leading-snug text-muted">
              {insiderBits}
            </div>
          )}
          {commentCountFor(dealing) > 0 && (
            <div className="mt-2">
              <CommentCountChip count={commentCountFor(dealing)} />
            </div>
          )}
        </div>
      </div>

      {/* Headline value */}
      <div className="mt-4 flex items-end gap-2.5">
        <span className="text-[34px] font-semibold leading-none tracking-[-0.045em] tabular-nums">
          {valueLabel}
        </span>
        {returnLabel && (
          <span
            className={`mb-0.5 text-[14px] font-semibold tabular-nums ${returnTone}`}
          >
            {returnLabel}
          </span>
        )}
      </div>

      {/* One-liner thesis — surfaced even under discretion to make the featured
          card more engaging (a teaser sliver, not the full analysis). */}
      {dealing.summary && (
        <p className="mt-3.5 text-[13.5px] leading-relaxed text-foreground/65 dark:text-foreground/65">
          {dealing.summary}
        </p>
      )}

      {/* Technical stat grid. */}
      {shownStats.length > 0 && (
        <dl className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-black/[0.07] bg-black/[0.06] dark:border-white/[0.07] dark:bg-white/[0.06]">
          {shownStats.map((s) => (
            <div
              key={s.label}
              className="flex flex-col gap-0.5 bg-sheet px-3 py-2 dark:bg-surface"
            >
              <dt className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted/80">
                {s.label}
              </dt>
              <dd
                className={`truncate font-mono text-[12.5px] font-medium tabular-nums ${s.tone ?? ""}`}
              >
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </button>
  );
}

/** Compact "12 Jun" date for the stat grid. */
function formatStatDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);

  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/* ───────── Mobile pinned "wallet" deck ──────────────────────────────────
 *
 * Today's cards flip through like an Apple Wallet deck on mobile. The hero
 * above fills the first screen with just the front card peeking up to invite
 * a scroll. As you scroll in, the deck pins: the "Today's deals" bar fades in
 * and anchors to the top, and scrolling scrubs the cards — the front card
 * lifts up and dissolves while the next rises to take its place. Scroller dots
 * beneath track position. Driven imperatively by one rAF-throttled scroll
 * listener so no React render runs per frame.
 */
const STAGE_TOP_PX = 64; // pin offset — sits flush under the navbar
const HEADER_ALLOWANCE = 44; // height of the pinned "Today's deals" bar
const HEADER_FADE_PX = 56; // scroll distance over which the bar fades in/anchors
const DECK_RISE_PX = 120; // scroll distance over which the card rises to centre
const DOTS_ALLOWANCE = 34; // space the scroller dots take beneath the deck
const STAGE_BOTTOM_GAP = 96; // room kept below the deck (mobile download bar)
const MIN_STAGE_PX = 360; // skeleton floor so short viewports still fit a card
const MAX_BEHIND = 2; // how many waiting cards stay visible behind the front
const BEHIND_SCALE = 0.05; // scale lost per layer of depth
const BEHIND_OFFSET = 12; // px each waiting card is nudged down behind the front
const BEHIND_DIM = 0.16; // opacity lost per layer of depth (recede into stack)

/** Ken Perlin's smootherstep (6x⁵−15x⁴+10x³): zero 1st & 2nd derivatives at
 *  both ends, so motion eases in and out with no kink. `x` is clamped to 0..1. */
function smootherstep(x: number): number {
  const t = x < 0 ? 0 : x > 1 ? 1 : x;

  return t * t * t * (t * (t * 6 - 15) + 10);
}

/** Reflects `prefers-reduced-motion: reduce`. When set we skip the scroll
 *  choreography entirely and render a plain stacked column. */
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mql.matches);

    sync();
    mql.addEventListener("change", sync);

    return () => mql.removeEventListener("change", sync);
  }, []);

  return reduced;
}

function MobilePinnedTodayDeck<W>({
  dealings,
  selectedKey,
  onSelect,
  fmt,
  showLogo,
  formatTickerDisplay,
  dateLabel,
}: {
  dealings: MarketDealing<W>[];
  selectedKey?: string | null;
  onSelect: (d: MarketDealing<W>) => void;
  fmt: PriceFormat;
  showLogo: boolean;
  formatTickerDisplay?: (ticker: string) => string;
  dateLabel: string;
}) {
  const n = dealings.length;
  const reduced = useReducedMotion();
  // The deck only exists below lg (the wrapper is lg:hidden). Without this
  // gate the scroll/measure effects stayed live after a resize up to desktop
  // — cardH kept its stale value, the hidden track measured as all-zero
  // rects, and snap() then "corrected" the page ~64px upward on every scroll
  // pause, scrubbing the user back to the top.
  const deckVisible = useMediaQuery("(max-width: 1023.98px)");
  const trackRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const deckRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dotRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [cardH, setCardH] = useState(0);
  const [viewportH, setViewportH] = useState(0);
  const hasDots = n > 1;

  // The header sticks to the top and the card+dots stick to the bottom (just
  // above the download bar) — the lit hero fills the gap between. The track
  // must stay taller than the viewport for the whole scrub so the bottom-pinned
  // card never un-sticks before the last transition lands; hence the +viewport.
  const step = cardH > 0 ? Math.max(300, Math.round(cardH + 56)) : 0;
  const trackH =
    cardH > 0 && viewportH > 0
      ? viewportH + STAGE_BOTTOM_GAP + Math.max(0, n - 1) * step
      : undefined;

  // Measure the tallest card to size the pinned card-stage. Re-runs on resize
  // and whenever a card reflows (text wrap at a new width). Each cardRef wraps
  // a TodayDeckCard whose root element carries the real (content) height.
  useLayoutEffect(() => {
    if (reduced || n === 0 || !deckVisible) return;

    const measure = () => {
      setViewportH(window.innerHeight);

      let max = 0;

      for (const wrap of cardRefs.current.slice(0, n)) {
        const card = wrap?.firstElementChild as HTMLElement | null;

        if (card) max = Math.max(max, card.offsetHeight);
      }
      if (max > 0) setCardH(max);
    };

    measure();
    const ro = new ResizeObserver(measure);

    cardRefs.current.slice(0, n).forEach((wrap) => {
      const card = wrap?.firstElementChild;

      if (card) ro.observe(card);
    });
    window.addEventListener("resize", measure);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [reduced, n, dealings, deckVisible]);

  // Scroll-scrub the deck. `progress` is measured in cards (0 → n-1): how far
  // the front of the stack has advanced. Each card's distance from the front
  // (`d`) maps to a transform — positive `d` waits behind, negative `d` is
  // being dealt away above.
  useEffect(() => {
    if (reduced || n === 0 || cardH === 0 || !deckVisible) return;

    let raf = 0;
    const stepNow = step;

    const apply = () => {
      raf = 0;
      const track = trackRef.current;

      if (!track) return;
      const rect = track.getBoundingClientRect();

      // Hidden track (mid-resize, before the effect tears down) measures as
      // an all-zero rect — bail rather than scrub from garbage geometry.
      if (rect.width === 0) return;
      // A departing card lifts up off the bottom-pinned stage into the lit gap
      // and dissolves — roughly half the viewport of travel.
      const exit = window.innerHeight * 0.55;

      // Header bar snaps in quickly right as the deck locks to the top.
      if (headerRef.current) {
        const headerIn = Math.max(
          0,
          Math.min(
            1,
            (STAGE_TOP_PX + HEADER_FADE_PX - rect.top) / HEADER_FADE_PX,
          ),
        );

        headerRef.current.style.opacity = headerIn.toFixed(3);
      }

      // Card rises from its peeking spot at the bottom up to centre and
      // resolves from semi-faded to solid over a longer, eased ramp — a soft
      // low teaser on the hero that glides into a crisp, centred card as the
      // section takes over.
      if (deckRef.current) {
        const rise = smootherstep(
          Math.max(
            0,
            Math.min(
              1,
              (STAGE_TOP_PX + DECK_RISE_PX - rect.top) / DECK_RISE_PX,
            ),
          ),
        );
        const lift = Math.max(
          0,
          window.innerHeight / 2 - 110 - DOTS_ALLOWANCE - cardH / 2,
        );

        deckRef.current.style.transform = `translate3d(0, ${(-rise * lift).toFixed(1)}px, 0)`;
        deckRef.current.style.opacity = (0.6 + 0.4 * rise).toFixed(3);
      }

      const raw = Math.max(
        0,
        Math.min(n - 1, (STAGE_TOP_PX - rect.top) / stepNow),
      );
      // "Point of no return": ease the *fractional* part of progress with
      // smootherstep so each transition dwells near the start (cards settle),
      // accelerates hard through the midpoint (the commit/tipping point), then
      // eases into the next resting position. Cards feel like they snap into
      // place without ever hijacking the native scroll.
      const base = Math.floor(raw);
      const progress = base + smootherstep(raw - base);

      for (let i = 0; i < n; i++) {
        const el = cardRefs.current[i];

        if (!el) continue;
        const d = i - progress;
        let translateY: number;
        let scale: number;
        let opacity: number;
        let interactive: boolean;

        if (d >= 0) {
          // Waiting in the stack (d === 0 is the live front card). Each layer
          // sits lower, smaller and dimmer so it reads as depth behind the
          // front card rather than a competing card. The deepest layer fades
          // fully out so cards don't pop in/out at the stack boundary.
          const depth = Math.min(d, MAX_BEHIND);

          scale = 1 - BEHIND_SCALE * depth;
          translateY = BEHIND_OFFSET * depth;
          const dim = 1 - BEHIND_DIM * depth;
          const edgeFade = Math.max(0, Math.min(1, MAX_BEHIND + 1 - d));

          opacity = Math.min(dim, edgeFade);
          interactive = d < 0.5;
        } else {
          // Being dealt away: lift clear of the pin line and dissolve. It holds
          // near-full opacity through the early/occluding phase, then fades out
          // on a smootherstep curve so the hand-off reads as a soft, eased
          // dissolve rather than a hard cut or a muddy cross-fade.
          const gone = Math.min(1, -d);
          const fade = smootherstep(Math.max(0, (gone - 0.3) / 0.7));

          translateY = -gone * exit;
          scale = 1 + 0.02 * gone;
          opacity = 1 - fade;
          interactive = false;
        }

        el.style.transform = `translate3d(0, ${translateY.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
        el.style.opacity = opacity.toFixed(3);
        el.style.zIndex = String(Math.round(1000 - d * 10));
        el.style.pointerEvents = interactive ? "auto" : "none";
      }

      // Scroller dots — the active dot stretches into a pill as progress
      // lands on it, so it doubles as a position read-out across the deck.
      for (let j = 0; j < dotRefs.current.length; j++) {
        const dot = dotRefs.current[j];

        if (!dot) continue;
        const near = Math.max(0, 1 - Math.abs(j - progress));

        dot.style.width = `${(6 + 12 * near).toFixed(1)}px`;
        dot.style.opacity = (0.28 + 0.72 * near).toFixed(3);
      }
    };

    // Snap-on-settle — the "point of no return". When scrolling stops in the
    // middle of a transition, ease the page to the nearest card boundary so
    // the deck always comes to rest on a whole card (and a half-committed
    // swipe past the midpoint completes rather than drifting back). Native
    // scroll is never blocked; we only nudge once it goes idle.
    let idle = 0;

    const snap = () => {
      const track = trackRef.current;

      if (!track) return;
      const rect = track.getBoundingClientRect();

      if (rect.width === 0) return;
      const raw = (STAGE_TOP_PX - rect.top) / stepNow;

      // Only while genuinely mid-deck — let the user enter/leave the ends free.
      if (raw <= 0.05 || raw >= n - 1.05) return;
      const target = Math.round(raw);

      if (Math.abs(raw - target) < 0.04) return; // already settled
      window.scrollTo({
        top: window.scrollY + rect.top - STAGE_TOP_PX + target * stepNow,
        behavior: "smooth",
      });
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply);
      clearTimeout(idle);
      idle = window.setTimeout(snap, 130);
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      clearTimeout(idle);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [n, reduced, cardH, step, deckVisible]);

  if (n === 0) return null;

  // Reduced-motion (or any non-scrolling fallback): plain stacked column,
  // with the heading restored inline (the flow copy is hidden on mobile-busy).
  if (reduced) {
    return (
      <div className="lg:hidden">
        <div className="mb-4">
          <TodayHeading dateLabel={dateLabel} />
        </div>
        <div className="space-y-4">
          {dealings.map((dealing) => (
            <TodayDeckCard
              key={dealing.key}
              dealing={dealing}
              fmt={fmt}
              formatTickerDisplay={formatTickerDisplay}
              selected={selectedKey === dealing.key}
              showLogo={showLogo}
              onSelect={() => onSelect(dealing)}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={trackRef}
      className="relative flex flex-col lg:hidden"
      style={{ height: trackH }}
    >
      {/* Header bar — sticks to the top, full-bleed, on top of everything, and
          fades in only as the deck anchors (invisible while you're still on the
          hero with just the card peeking up). pointer-events-none so it never
          steals taps from the card beneath it. */}
      <div
        ref={headerRef}
        className="pointer-events-none sticky top-[var(--nav-h)] z-30 -mx-4 border-b border-black/[0.07] bg-[#f5f0e8] px-4 py-3.5 dark:border-white/[0.07] dark:bg-background md:-mx-6 md:px-6"
        style={{ opacity: 0 }}
      >
        <TodayHeading dateLabel={dateLabel} />
      </div>

      {/* Spacer pushes the card's natural position to the foot of the track, so
          `sticky bottom` holds it pinned low for the whole scroll instead of
          letting it snap up under the header. */}
      <div className="flex-1" />

      {/* Card + dots — stick low (just above the download bar) so the card
          peeks there beneath the hero, then `apply()` lifts it to centre and
          fades it to solid as the deck anchors. The lit hero fills the gap. */}
      <div
        ref={deckRef}
        className="sticky z-10 will-change-transform"
        style={{ bottom: STAGE_BOTTOM_GAP, opacity: 0.6 }}
      >
        <div className="relative" style={{ height: cardH || undefined }}>
          {dealings.map((dealing, index) => (
            <div
              key={dealing.key}
              ref={(el) => {
                cardRefs.current[index] = el;
              }}
              className="absolute inset-0 flex items-start justify-center will-change-transform"
              style={{
                transformOrigin: "center center",
                // Start nested so the first paint already looks like a stack.
                transform: `translate3d(0, ${BEHIND_OFFSET * Math.min(index, MAX_BEHIND)}px, 0) scale(${1 - BEHIND_SCALE * Math.min(index, MAX_BEHIND)})`,
                opacity:
                  index > MAX_BEHIND
                    ? 0
                    : 1 - BEHIND_DIM * Math.min(index, MAX_BEHIND),
                zIndex: 1000 - index * 10,
              }}
            >
              <TodayDeckCard
                dealing={dealing}
                fmt={fmt}
                formatTickerDisplay={formatTickerDisplay}
                selected={selectedKey === dealing.key}
                showLogo={showLogo}
                onSelect={() => onSelect(dealing)}
              />
            </div>
          ))}
        </div>

        {/* Scroller dots — how many filings, and where you are in the deck. */}
        {hasDots && (
          <div
            aria-hidden
            className="flex items-center justify-center gap-1.5 pt-3"
            style={{ height: DOTS_ALLOWANCE }}
          >
            {dealings.map((dealing, j) => (
              <span
                key={dealing.key}
                ref={(el) => {
                  dotRefs.current[j] = el;
                }}
                className="h-1.5 rounded-full bg-foreground"
                style={{
                  width: j === 0 ? 18 : 6,
                  opacity: j === 0 ? 1 : 0.28,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MobilePinnedTodayDeckSkeleton() {
  return (
    <div
      className="relative lg:hidden"
      style={{
        height: `max(${MIN_STAGE_PX}px, calc(100svh - ${STAGE_TOP_PX + HEADER_ALLOWANCE + STAGE_BOTTOM_GAP}px))`,
      }}
    >
      {Array.from({ length: MAX_BEHIND + 1 }).map((_, i) => (
        <div
          key={i}
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transformOrigin: "center center",
            transform: `translate3d(0, ${BEHIND_OFFSET * i}px, 0) scale(${1 - BEHIND_SCALE * i})`,
            opacity: 1 - BEHIND_DIM * i,
            zIndex: 1000 - i * 10,
          }}
        >
          <TodayCardSkeleton hero />
        </div>
      ))}
    </div>
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
              : "bg-sheet dark:bg-surface"
          }`}
        >
          {view.isLive && <LiveWash />}
          <MarketAnchorPanel view={view} />
        </div>
        {showGrid && (
          <div className="flex min-w-0 flex-col bg-sheet dark:bg-surface">
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
        ? "text-positive"
        : "text-rose-600 dark:text-rose-400";

  return (
    <button
      className={`group flex items-center gap-3 p-3 text-left transition-colors ${
        selected
          ? "bg-brand-brown/[0.06] dark:bg-brand-brown/[0.20]"
          : "bg-sheet hover:bg-[#f1ebe2] dark:bg-surface dark:hover:bg-surface-secondary"
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
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-hairline font-mono text-[10px] font-semibold text-muted dark:bg-surface-secondary">
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
    <div className="flex items-center gap-3 bg-sheet p-3 dark:bg-surface">
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

function TodayCardSkeleton({ hero = false }: { hero?: boolean }) {
  return (
    <div
      className={`w-full border border-black/[0.08] bg-sheet dark:border-white/[0.08] dark:bg-surface ${hero ? "rounded-[20px] p-5 shadow-[0_18px_44px_-16px_rgba(30,21,6,0.26)] md:p-6" : "h-full rounded-xl p-4 md:p-5"}`}
    >
      <div className={`flex items-start gap-3.5 ${hero ? "" : "gap-4"}`}>
        <Skeleton circle h={48} w={48} />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className={`${hero ? "h-6" : "h-5"} w-3/4 rounded`} />
          <Skeleton className="h-3 w-1/2 rounded" />
          <Skeleton className={`${hero ? "h-8" : "h-6"} w-28 rounded`} />
        </div>
      </div>
      <div className="mt-4 space-y-1.5">
        <Skeleton className="h-3 w-full rounded" />
        <Skeleton className="h-3 w-5/6 rounded" />
      </div>
      {hero && (
        <div className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-xl">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-none" />
          ))}
        </div>
      )}
    </div>
  );
}

/** Stagger delays for the Today hero cascade — header first, then anchor,
 *  then cards. */
function todayHeroDelay(index: number, extraMs = 0): string {
  return `${50 + index * 75 + extraMs}ms`;
}

/** "17 June" — the date that rides alongside the "Today's deals" header. */
function formatTodayDate(iso: string, locale = "en-GB"): string {
  const d = new Date(`${iso}T12:00:00`);

  if (Number.isNaN(d.getTime())) return "";

  return d.toLocaleDateString(locale, { day: "numeric", month: "long" });
}
