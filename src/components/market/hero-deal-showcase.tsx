/** The hero "instrument" — the live-deal showcase as a contained object on
 *  the page ground (the house rule: contained, not blended). A rounded,
 *  hairline-bordered panel; the message column beside it never overlaps it,
 *  so neither needs a scrim.
 *
 *  A basemap used to fill the frame. Contained at this size it read as grey
 *  street noise — all texture, no message — so the panel now carries only
 *  the two things that actually sell: the company queue and the live
 *  notification stack, over a pure-CSS radar motif (concentric hairline
 *  rings + the disclosure blips) that keeps the "filings landing as they
 *  happen" story without a map library. Everything advances on the shared
 *  radar clock so queue and stack read as one feed.
 *
 *  Layers:
 *    - the radar: rings centred behind the notification stack, so each new
 *      card reads as the thing the sweep just picked up;
 *    - the company queue along the top — every sample deal's logo in a glass
 *      capsule, the active one ringed in the beacon colour (the iOS
 *      Performance clusters pattern: the previews show what's coming, the
 *      highlight shows where we are);
 *    - the notification stack, badge avatar off — the queue already names
 *      the active company.
 */
import type { DealRadar } from "./hero-deal-radar";

import { HeroNotificationStack } from "./hero-notification-stack";

import { CompanyLogo } from "@/components/company-logo";

/** Radar blips around the rings — hand-placed clear of the queue (top) and
 *  the stack (centre), staggered so somewhere on the panel blinks every
 *  couple of seconds. Reuses the market-hero pulse keyframes; sizes stay
 *  small so they read as contacts, not markers. */
const BLIPS = [
  { left: "16%", top: "36%", size: 7, delay: 0.6 },
  { left: "82%", top: "30%", size: 8, delay: 2.9 },
  { left: "10%", top: "70%", size: 8, delay: 5.1 },
  { left: "88%", top: "76%", size: 7, delay: 7.4 },
];

/** One column of the queue: logo above bare ticker. Active gets the ring +
 *  full strength; the rest wait dimmed. inline-flex on the ring wrapper so
 *  it hugs the logo's square box — on a bare inline span the ring traces
 *  the line-box and renders as an oval. Pure CSS transitions keyed off the
 *  shared activeIndex — nothing here owns a clock. */
function QueueItem({ ticker, active }: { ticker: string; active: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span
        className={`inline-flex rounded-full transition-all duration-500 ${
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
    <div className="relative flex h-[480px] flex-col overflow-hidden rounded-3xl border border-black/[0.08] bg-gradient-to-b from-[#f1ece3] to-[#e9e1d3] p-6 shadow-[0_24px_60px_-32px_rgba(90,65,40,0.5)] dark:border-white/[0.10] dark:bg-gradient-to-b dark:from-[oklch(21%_0.022_55)] dark:to-[oklch(17%_0.022_55)] dark:shadow-[0_24px_60px_-32px_rgba(0,0,0,0.8)]">
      <style>{`
        /* Concentric radar rings, centred where the notification stack sits
           so new cards read as contacts the sweep picked up. Hairline borders
           in the beacon brown, fading outward; the outer rings run past the
           frame and are clipped by it — the panel is a window onto the sweep,
           not a diagram of it. */
        .hds-rings { position: absolute; left: 50%; top: 62%; }
        .hds-ring {
          position: absolute; border-radius: 50%;
          transform: translate(-50%, -50%);
          border: 1px solid rgba(139, 96, 64, 0.13);
        }
        :is(.dark) .hds-ring { border-color: rgba(173, 148, 121, 0.14); }
        .hds-ring:nth-child(2) { opacity: 0.72; }
        .hds-ring:nth-child(3) { opacity: 0.5; }
        .hds-ring:nth-child(4) { opacity: 0.32; }
        .hds-ring:nth-child(5) { opacity: 0.18; }
      `}</style>

      {/* Radar backdrop. */}
      <div aria-hidden className="hds-rings pointer-events-none">
        {[120, 230, 340, 460, 590].map((d) => (
          <span
            key={d}
            className="hds-ring"
            style={{ width: d, height: d }}
          />
        ))}
      </div>
      {/* Disclosure blips — same keyframes the non-app hero stage uses
          (defined in market-hero's stylesheet, which always renders on the
          pages that mount this panel). */}
      {BLIPS.map((p) => (
        <span
          key={`${p.left}-${p.top}`}
          aria-hidden
          className="hero-pulse"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}s`,
          }}
        >
          <span className="hero-pulse-ring" />
          <span className="hero-pulse-ring hero-pulse-ring-2" />
        </span>
      ))}

      {/* Company queue — a glass capsule, same material language as the
          floating navbar. */}
      <div className="pointer-events-none relative z-10 flex justify-center">
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

      {/* Live notification stack, centred in the remaining space over the
          rings' origin. */}
      <div className="pointer-events-none relative z-10 my-auto">
        <HeroNotificationStack
          badge={false}
          deals={radar.deals}
          tick={radar.tick}
        />
      </div>
    </div>
  );
}
