import type { ComponentType, ReactNode } from "react";
import type { GatingInfo, MarketDealing } from "@/lib/markets/types";
import type { PriceFormat } from "@/components/position-card";

import { useCallback, useEffect, useRef, useState } from "react";
import { Drawer } from "vaul";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";

import { CompanyLogo } from "@/components/company-logo";
import { RatingBadge } from "@/components/rating-badge";
import { ClusterChip } from "@/components/cluster-chip";
import { PartyChip } from "@/components/party-chip";
import { RecentBuysSection } from "@/components/market/recent-buys-section";
import { InsiderAvatar } from "@/components/market/market-row";
import { useMediaQuery } from "@/lib/use-media-query";

/** Deal detail drawer used by every market. Built on vaul so it slides in
 *  from the right as a side panel on md+ and rises as a drag-to-dismiss
 *  bottom sheet on mobile. vaul owns the backdrop, slide/transform,
 *  escape-to-close, body-scroll lock and focus trap; the body slot fills in
 *  market-specific structure (Form 4 footnotes, RNS director history, …).
 *
 *  `handleOnly` keeps drag-to-dismiss confined to the mobile grab handle, so
 *  the scrollable body and the embedded price chart never hijack a drag. */
export function MarketDetailDrawer<W>({
  dealing,
  allDealings,
  onClose,
  onSelectDealing,
  fmt,
  locale,
  DetailBody,
  DetailPosition,
  gating,
  DummyDetailBody,
  AnalysisOverlay,
  showLogo = true,
  formatTickerDisplay,
  insiderLabel = "Insider",
  detailFields,
}: {
  dealing: MarketDealing<W> | null;
  /** Full in-memory dealings list — used by RecentBuysSection to surface
   *  other recent buys on the same ticker. The shell stays stateless; the
   *  list is whatever the parent fetched. */
  allDealings: MarketDealing<W>[];
  onClose: () => void;
  /** Re-target the drawer at another dealing without closing it — wired to
   *  the RecentBuysSection rows so a related buy opens its own analysis. */
  onSelectDealing?: (dealing: MarketDealing<W>) => void;
  fmt: PriceFormat;
  locale?: string;
  DetailBody: ComponentType<{
    dealing: MarketDealing<W>;
    allDealings?: MarketDealing<W>[];
  }>;
  DetailPosition?: ComponentType<{ dealing: MarketDealing<W> }>;
  /** Optional gating state — when set, the drawer records a view on open
   *  and may swap to the dummy body + overlay. */
  gating?: GatingInfo;
  DummyDetailBody?: ComponentType<{
    dealing: MarketDealing<W>;
    allDealings?: MarketDealing<W>[];
  }>;
  AnalysisOverlay?: ComponentType;
  /** Mirror of the row prop — when false, the header + body logo bubbles
   *  are suppressed. Wired from MarketConfig.enableLogos. Default true. */
  showLogo?: boolean;
  /** Human-readable ticker formatter from MarketConfig. */
  formatTickerDisplay?: (ticker: string) => string;
  /** Label for the person field in the header grid. Default "Insider". */
  insiderLabel?: string;
  /** Optional per-market override for the metadata grid cells. See
   *  MarketConfig.detailFields. */
  detailFields?: (
    dealing: MarketDealing<W>,
  ) => Array<{ label: string; value: ReactNode } | null | false | undefined>;
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const direction = isDesktop ? "right" : "bottom";
  const open = !!dealing;

  // Keep rendering the last-opened dealing through vaul's close animation so
  // the panel doesn't flash empty as it slides out. Cleared on animation end.
  const [active, setActive] = useState(dealing);

  useEffect(() => {
    if (dealing) setActive(dealing);
  }, [dealing]);

  // Breadcrumb stack of dealings the reader drilled into from the in-drawer
  // "Other recent buys" links, so a back button can walk them out without
  // closing the panel. Reset on each fresh open (closed → open); related-buy
  // navigations keep the panel open, so they don't trip the reset.
  const [history, setHistory] = useState<MarketDealing<W>[]>([]);
  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (open && !prevOpenRef.current) setHistory([]);
    prevOpenRef.current = open;
  }, [open]);

  const handleSelectRelated = useCallback(
    (d: MarketDealing<W>) => {
      setHistory((h) => (active ? [...h, active] : h));
      onSelectDealing?.(d);
    },
    [active, onSelectDealing],
  );

  const handleBack = useCallback(() => {
    setHistory((h) => {
      const prev = h[h.length - 1];

      if (prev) onSelectDealing?.(prev);

      return h.slice(0, -1);
    });
  }, [onSelectDealing]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  // Whether more content sits below the fold — drives the bottom "lip" fade
  // so the user knows the panel scrolls. Default true (assume it fits) to
  // avoid flashing the lip before the first measure.
  const [atBottom, setAtBottom] = useState(true);

  const recompute = useCallback(() => {
    const el = scrollRef.current;

    if (!el) return;
    setScrolled(el.scrollTop > 56);
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 8);
  }, []);

  useEffect(() => {
    setScrolled(false);
    const el = scrollRef.current;

    if (el) el.scrollTop = 0;
  }, [active?.key]);

  // Recompute the bottom-lip state when the content first mounts and whenever
  // it resizes (the price chart + recent buys load in after open) or the
  // panel itself is resized.
  useEffect(() => {
    const scroller = scrollRef.current;
    const content = contentRef.current;

    if (!scroller || !content) return;

    const ro = new ResizeObserver(() => recompute());

    ro.observe(scroller);
    ro.observe(content);
    recompute();

    return () => ro.disconnect();
  }, [active?.key, recompute]);

  // Record the view on every drawer open. recordView is idempotent per
  // dealId so re-renders during the same view don't matter; the first
  // open of the day becomes the "freebie" and subsequent ones get gated.
  useEffect(() => {
    if (!dealing || !gating?.enabled) return;
    gating.recordView(dealing.id);
  }, [dealing, gating]);

  const gated =
    gating?.enabled === true && !!active && !gating.hasFullAccess(active.id);
  const BodyComponent = gated && DummyDetailBody ? DummyDetailBody : DetailBody;
  const leadWithBody = !!active && !active.rating;

  const rawTicker = active?.ticker || "—";
  const ticker = formatTickerDisplay
    ? formatTickerDisplay(rawTicker)
    : rawTicker;
  const company = active?.company || "—";
  const valueLabel =
    active && active.value != null ? fmt.formatValue(active.value) : "—";
  const sharesLabel =
    active && active.shares > 0 ? active.shares.toLocaleString() : "—";
  // Secondary metadata row — mirrors the iOS DealDetailView metrics grid.
  // Each is optional: industry rides on the wire row; confidence + catalyst
  // come from the deep-analysis pipeline, so they're absent on unanalysed
  // dealings (and on markets without an analysis layer).
  const industryLabel = active?.sector ?? null;
  const confidenceLabel =
    active && active.confidence != null
      ? `${Math.round(active.confidence * 100)}%`
      : null;
  const catalystLabel = active?.catalystWindow ?? null;

  // Detached, floating panel (vaul "side drawer" style): a gap on every
  // free edge + rounded corners so it reads as a card lifted off the page
  // rather than a slab welded to the screen edge. Desktop floats off the
  // right; mobile floats up from the bottom.
  const contentClass = isDesktop
    ? "fixed top-3 bottom-3 right-3 z-50 w-[calc(100vw-1.5rem)] max-w-2xl rounded-2xl bg-background border border-black/10 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden outline-none"
    : "fixed bottom-2 inset-x-2 z-50 h-[88vh] max-h-[88vh] rounded-2xl bg-background border border-black/10 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden outline-none";

  return (
    <Drawer.Root
      handleOnly
      direction={direction}
      open={open}
      onAnimationEnd={(isOpen) => {
        if (!isOpen) setActive(null);
      }}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Drawer.Content className={contentClass}>
          {!isDesktop && (
            <div className="shrink-0 pt-3 pb-1 flex justify-center">
              <Drawer.Handle className="!w-10 !bg-black/15 dark:!bg-white/20" />
            </div>
          )}

          {active && (
            <>
              <Drawer.Title className="sr-only">{company}</Drawer.Title>
              <Drawer.Description className="sr-only">
                {active.insiderRole
                  ? `${active.insiderName} (${active.insiderRole})`
                  : active.insiderName}
              </Drawer.Description>

              <div
                className={`shrink-0 flex items-center gap-3 px-5 md:px-8 py-4 border-b transition-all duration-200
                ${
                  scrolled
                    ? "border-black/10 dark:border-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.3)]"
                    : "border-transparent"
                }`}
              >
                {history.length > 0 && (
                  <button
                    aria-label="Back"
                    className="shrink-0 -ml-1 flex items-center text-muted hover:text-foreground"
                    onClick={handleBack}
                  >
                    <ChevronLeftIcon className="h-5 w-5" />
                  </button>
                )}
                {/* Logo + ticker only surface once you've scrolled past the
                    big header — the top bar stays clean on open. */}
                {showLogo && (
                  <CompanyLogo
                    className={`transition-opacity duration-200 ${scrolled ? "opacity-100" : "opacity-0"}`}
                    size={32}
                    ticker={rawTicker}
                  />
                )}
                <span
                  className={`font-mono text-xs bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded shrink-0 transition-opacity duration-200 ${scrolled ? "opacity-100" : "opacity-0"}`}
                >
                  {ticker}
                </span>
                {active.rating && (
                  <RatingBadge
                    className={`shrink-0 transition-opacity duration-200 ${
                      scrolled ? "opacity-100" : "opacity-0"
                    }`}
                    rating={active.rating}
                  />
                )}
                <span
                  className={`font-semibold text-sm truncate flex-1 min-w-0 transition-opacity duration-200
                  ${scrolled ? "opacity-100" : "opacity-0"}`}
                >
                  {company}
                </span>
                <button
                  aria-label="Close"
                  className="shrink-0 text-muted hover:text-foreground text-2xl leading-none px-1"
                  onClick={onClose}
                >
                  ×
                </button>
              </div>

              <div className="relative flex-1 min-h-0">
                <div
                  ref={scrollRef}
                  className="h-full overflow-y-auto overflow-x-hidden overscroll-contain"
                  onScroll={recompute}
                >
                  <div
                    ref={contentRef}
                    className="px-5 pb-5 pt-1 md:px-8 md:pb-8 md:pt-2 space-y-6"
                  >
                    {/* Company on top, the person who made the buy beneath,
                        tied together by an org-chart connector so the header
                        reads "this purchase was made by this person". */}
                    <div>
                      <div className="flex items-center gap-4">
                        {showLogo && (
                          <CompanyLogo size={56} ticker={rawTicker} />
                        )}
                        <h1 className="text-3xl font-bold leading-tight tracking-tight flex-1 min-w-0">
                          {company}
                        </h1>
                        <ClusterChip
                          className="shrink-0"
                          cluster={active.cluster}
                        />
                      </div>

                      <div className="flex items-stretch">
                        {/* Curved elbow connector — drops from under the logo
                            and sweeps into the buyer's avatar, in a soft brand
                            tint so the company→person link reads at a glance. */}
                        <div
                          aria-hidden
                          className={`relative shrink-0 ${showLogo ? "w-14" : "w-5"}`}
                        >
                          <div
                            className={`absolute top-0 bottom-1/2 rounded-bl-[14px] border-b-2 border-l-2 border-[#5a4128]/25 dark:border-[#ad9479]/30 ${showLogo ? "left-7 right-1.5" : "left-2 right-0"}`}
                          />
                        </div>
                        <div className="flex items-center gap-3 py-2">
                          {/* Only show a portrait when we actually have one
                              (Congress members). Other markets have no insider
                              images, so we skip the placeholder initials bubble
                              and let the connector run straight to the name. */}
                          {active.insiderPhotoUrl && (
                            <div className="relative shrink-0">
                              <InsiderAvatar
                                name={active.insiderName}
                                photoUrl={active.insiderPhotoUrl}
                                size={44}
                              />
                              <span
                                aria-hidden
                                className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-[#5a4128]/15 dark:ring-[#ad9479]/20"
                              />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-[10px] uppercase tracking-wide text-muted mb-0.5">
                              {insiderLabel}
                            </div>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-base font-semibold truncate">
                                {active.insiderName}
                              </span>
                              {active.party && (
                                <PartyChip party={active.party} />
                              )}
                            </div>
                            {active.insiderRole && (
                              <div className="text-xs text-muted truncate">
                                {active.insiderRole}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 py-4 border-y border-black/10 dark:border-white/10">
                      {detailFields ? (
                        detailFields(active)
                          .filter(
                            (f): f is { label: string; value: ReactNode } =>
                              !!f,
                          )
                          .map((f) => (
                            <div key={f.label} className="min-w-0">
                              <dt className="text-[10px] text-muted uppercase tracking-wide mb-0.5">
                                {f.label}
                              </dt>
                              <dd className="text-sm font-medium">{f.value}</dd>
                            </div>
                          ))
                      ) : (
                        <>
                          <div>
                            <dt className="text-[10px] text-muted uppercase tracking-wide mb-0.5">
                              Action
                            </dt>
                            <dd className="text-sm font-medium">
                              {active.actionLabel}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[10px] text-muted uppercase tracking-wide mb-0.5">
                              Amount
                            </dt>
                            <dd className="text-sm font-medium">{valueLabel}</dd>
                          </div>
                          {active.shares > 0 && (
                            <div>
                              <dt className="text-[10px] text-muted uppercase tracking-wide mb-0.5">
                                Shares
                              </dt>
                              <dd className="text-sm font-medium tabular-nums">
                                {sharesLabel}
                              </dd>
                            </div>
                          )}
                          {industryLabel && (
                            <div className="min-w-0">
                              <dt className="text-[10px] text-muted uppercase tracking-wide mb-0.5">
                                Industry
                              </dt>
                              <dd className="text-sm font-medium truncate">
                                {industryLabel}
                              </dd>
                            </div>
                          )}
                          {confidenceLabel && (
                            <div>
                              <dt className="text-[10px] text-muted uppercase tracking-wide mb-0.5">
                                Confidence
                              </dt>
                              <dd className="text-sm font-medium tabular-nums">
                                {confidenceLabel}
                              </dd>
                            </div>
                          )}
                          {catalystLabel && (
                            <div>
                              <dt className="text-[10px] text-muted uppercase tracking-wide mb-0.5">
                                Catalyst
                              </dt>
                              <dd className="text-sm font-medium">
                                {catalystLabel}
                              </dd>
                            </div>
                          )}
                        </>
                      )}
                    </dl>

                    {DetailPosition && <DetailPosition dealing={active} />}

                    {leadWithBody && (
                      <>
                        {gated ? (
                          <div className="relative">
                            <div
                              aria-hidden
                              className="pointer-events-none select-none"
                              style={{ filter: "blur(4px)" }}
                            >
                              <BodyComponent allDealings={allDealings} dealing={active} />
                            </div>
                            {AnalysisOverlay && <AnalysisOverlay />}
                          </div>
                        ) : (
                          <BodyComponent allDealings={allDealings} dealing={active} />
                        )}
                      </>
                    )}

                    <RecentBuysSection
                      allDealings={allDealings}
                      currentDealing={active}
                      fmt={fmt}
                      formatTickerDisplay={formatTickerDisplay}
                      locale={locale}
                      onSelect={onSelectDealing ? handleSelectRelated : undefined}
                    />

                    {!leadWithBody &&
                      (gated ? (
                        <div className="relative">
                          <div
                            aria-hidden
                            className="pointer-events-none select-none"
                            style={{ filter: "blur(4px)" }}
                          >
                            <BodyComponent allDealings={allDealings} dealing={active} />
                          </div>
                          {AnalysisOverlay && <AnalysisOverlay />}
                        </div>
                      ) : (
                        <BodyComponent allDealings={allDealings} dealing={active} />
                      ))}
                  </div>
                </div>
                {!atBottom && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-12 bg-gradient-to-t from-background to-transparent"
                  />
                )}
              </div>
            </>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
