import type { ComponentType } from "react";
import type { GatingInfo, MarketDealing } from "@/lib/markets/types";
import type { PriceFormat } from "@/components/position-card";

import { useCallback, useEffect, useRef, useState } from "react";
import { Drawer } from "vaul";

import { CompanyLogo } from "@/components/company-logo";
import { RatingBadge } from "@/components/rating-badge";
import { RecentBuysSection } from "@/components/market/recent-buys-section";
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
  fmt,
  locale,
  DetailBody,
  DetailPosition,
  gating,
  DummyDetailBody,
  AnalysisOverlay,
  showLogo = true,
  formatTickerDisplay,
}: {
  dealing: MarketDealing<W> | null;
  /** Full in-memory dealings list — used by RecentBuysSection to surface
   *  other recent buys on the same ticker. The shell stays stateless; the
   *  list is whatever the parent fetched. */
  allDealings: MarketDealing<W>[];
  onClose: () => void;
  fmt: PriceFormat;
  locale?: string;
  DetailBody: ComponentType<{ dealing: MarketDealing<W> }>;
  DetailPosition?: ComponentType<{ dealing: MarketDealing<W> }>;
  /** Optional gating state — when set, the drawer records a view on open
   *  and may swap to the dummy body + overlay. */
  gating?: GatingInfo;
  DummyDetailBody?: ComponentType<{ dealing: MarketDealing<W> }>;
  AnalysisOverlay?: ComponentType;
  /** Mirror of the row prop — when false, the header + body logo bubbles
   *  are suppressed. Wired from MarketConfig.enableLogos. Default true. */
  showLogo?: boolean;
  /** Human-readable ticker formatter from MarketConfig. */
  formatTickerDisplay?: (ticker: string) => string;
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

  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;

    if (!el) return;
    setScrolled(el.scrollTop > 56);
  }, []);

  useEffect(() => {
    setScrolled(false);
    const el = scrollRef.current;

    if (el) el.scrollTop = 0;
  }, [active?.key]);

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

  const rawTicker = active?.ticker || "—";
  const ticker = formatTickerDisplay
    ? formatTickerDisplay(rawTicker)
    : rawTicker;
  const company = active?.company || "—";
  const insiderLine = active
    ? active.insiderRole
      ? `${active.insiderName} (${active.insiderRole})`
      : active.insiderName
    : "";
  const valueLabel =
    active && active.value != null ? fmt.formatValue(active.value) : "—";
  const sharesLabel =
    active && active.shares > 0 ? active.shares.toLocaleString() : "—";

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
                {insiderLine}
              </Drawer.Description>

              <div
                className={`shrink-0 flex items-center gap-3 px-5 md:px-8 py-4 border-b transition-all duration-200
                ${
                  scrolled
                    ? "border-black/10 dark:border-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.3)]"
                    : "border-transparent"
                }`}
              >
                {showLogo && <CompanyLogo size={32} ticker={rawTicker} />}
                <span className="font-mono text-xs bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded shrink-0">
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

              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto overscroll-contain"
                onScroll={handleScroll}
              >
                <div className="p-5 md:p-8 space-y-6">
                  <div className="flex items-center gap-4">
                    {showLogo && <CompanyLogo size={56} ticker={rawTicker} />}
                    <h1 className="text-3xl font-bold leading-tight tracking-tight flex-1 min-w-0">
                      {company}
                    </h1>
                  </div>

                  <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4 py-4 border-y border-black/10 dark:border-white/10">
                    <div>
                      <dt className="text-[10px] text-muted uppercase tracking-wide mb-0.5">
                        Insider
                      </dt>
                      <dd className="text-sm font-medium truncate">
                        {insiderLine}
                      </dd>
                    </div>
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
                    <div>
                      <dt className="text-[10px] text-muted uppercase tracking-wide mb-0.5">
                        Shares
                      </dt>
                      <dd className="text-sm font-medium tabular-nums">
                        {sharesLabel}
                      </dd>
                    </div>
                  </dl>

                  {DetailPosition && <DetailPosition dealing={active} />}

                  <RecentBuysSection
                    allDealings={allDealings}
                    currentDealing={active}
                    fmt={fmt}
                    formatTickerDisplay={formatTickerDisplay}
                    locale={locale}
                  />

                  {gated ? (
                    <div className="relative">
                      <div
                        aria-hidden
                        className="pointer-events-none select-none"
                        style={{ filter: "blur(4px)" }}
                      >
                        <BodyComponent dealing={active} />
                      </div>
                      {AnalysisOverlay && <AnalysisOverlay />}
                    </div>
                  ) : (
                    <BodyComponent dealing={active} />
                  )}
                </div>
              </div>
            </>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
