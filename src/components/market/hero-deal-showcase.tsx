/** The hero "instrument" — the deal radar as a contained object instead of a
 *  backdrop. The map sits inside a rounded, hairline-bordered panel on the
 *  page ground; the message column beside it never overlaps it, so neither
 *  needs a scrim or an edge fade — the frame IS the edge (the house rule:
 *  contained, not blended).
 *
 *  Three layers, all driven by the shared radar clock so they read as one
 *  live feed:
 *    - the map, panning between deal HQ cities with a rippling beacon;
 *    - the company queue along the top — every sample deal's logo in a glass
 *      capsule, the active one ringed in the beacon colour (the iOS
 *      Performance clusters pattern: the previews show what's coming, the
 *      highlight shows where we are);
 *    - the notification stack docked across the bottom, badge avatar off —
 *      the queue already names the active company.
 */
import type { DealRadar } from "./hero-deal-radar";

import { HeroDealMapLayer } from "./hero-deal-radar";
import { HeroNotificationStack } from "./hero-notification-stack";

import { CompanyLogo } from "@/components/company-logo";

/** One column of the queue: logo above bare ticker. Active gets the ring +
 *  full strength; the rest wait dimmed. Pure CSS transitions keyed off the
 *  shared activeIndex — nothing here owns a clock. */
function QueueItem({ ticker, active }: { ticker: string; active: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span
        className={`rounded-full transition-all duration-500 ${
          active
            ? "scale-110 ring-2 ring-[#8B6040] dark:ring-brand-tan"
            : "scale-100 opacity-55 ring-2 ring-transparent"
        }`}
      >
        <CompanyLogo size={36} ticker={ticker} />
      </span>
      <span
        className={`font-mono text-[9px] font-semibold uppercase tracking-[0.08em] transition-colors duration-500 ${
          active ? "text-ink dark:text-white" : "text-ink/45 dark:text-white/40"
        }`}
      >
        {ticker.replace(/\.L$/, "")}
      </span>
    </div>
  );
}

export function HeroDealShowcase({ radar }: { radar: DealRadar }) {
  return (
    <div className="relative h-[520px] overflow-hidden rounded-3xl border border-black/[0.08] bg-[#eae4d8] shadow-[0_24px_60px_-32px_rgba(90,65,40,0.5)] dark:border-white/[0.10] dark:bg-[oklch(19%_0.022_55)] dark:shadow-[0_24px_60px_-32px_rgba(0,0,0,0.8)]">
      {/* The map fills the frame. Decorative (aria-hidden) but NOT
          pointer-events-none: the compact ⓘ attribution control (top-right,
          see hero-deal-map) must stay clickable; the map itself is created
          non-interactive so clicks can't pan it. */}
      <div aria-hidden className="absolute inset-0">
        <HeroDealMapLayer
          activeIndex={radar.activeIndex}
          deals={radar.deals}
          isDark={radar.isDark}
          mapConfig={radar.mapConfig}
        />
      </div>

      {/* Company queue — a glass capsule floating at the top of the frame,
          same material language as the floating navbar. */}
      <div className="pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center">
        <div className="flex items-start gap-4 rounded-2xl border border-black/[0.06] bg-[#f5f0e8]/70 px-4 py-2.5 shadow-sm backdrop-blur-md dark:border-white/[0.10] dark:bg-black/35">
          {radar.deals.map((deal, i) => (
            <QueueItem
              key={deal.id}
              active={i === radar.activeIndex}
              ticker={deal.ticker}
            />
          ))}
        </div>
      </div>

      {/* Live notification stack, docked. The card's own dark translucent
          fill keeps it legible over the basemap — no scrim. */}
      <div className="pointer-events-none absolute inset-x-5 bottom-5 z-10">
        <HeroNotificationStack
          badge={false}
          deals={radar.deals}
          tick={radar.tick}
        />
      </div>
    </div>
  );
}
