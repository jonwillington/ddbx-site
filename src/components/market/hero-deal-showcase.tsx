/** The hero "instrument" — the live-deal showcase as a contained object on
 *  the page ground (the house rules: contained, not blended; big simple
 *  rounded containers WITH CONTRAST). The panel commits to one dark warm-ink
 *  surface in both themes, like the notification card it exists to stage: on
 *  the cream page it's the bold anchor object, in dark mode it reads as a
 *  lit instrument a step off the background. An earlier cream-on-cream pass
 *  proved the alternative — same-tone panel, invisible rings, content
 *  floating in an empty beige box.
 *
 *  (A MapLibre basemap filled the frame before that. Contained at this size
 *  it read as grey street noise, so the panel carries only the two things
 *  that actually sell: the company queue and the live notification stack,
 *  over a pure-CSS radar motif. Everything advances on the shared radar
 *  clock so queue and stack read as one feed.)
 *
 *  Layers:
 *    - the radar: warm-amber concentric rings centred behind the stack, so
 *      each new card reads as a contact the sweep just picked up, plus
 *      staggered disclosure blips;
 *    - the company queue along the top — every sample deal's logo in a glass
 *      capsule, the active one ringed in the brand amber (the iOS
 *      Performance clusters pattern: the previews show what's coming, the
 *      highlight shows where we are);
 *    - the notification stack, badge avatar off — the queue already names
 *      the active company;
 *    - a one-line instrument caption grounding the foot of the panel.
 */
import type { DealRadar } from "./hero-deal-radar";

import { HeroNotificationStack } from "./hero-notification-stack";

import { CompanyLogo } from "@/components/company-logo";

/** Radar blips around the rings — hand-placed clear of the queue (top) and
 *  the stack (centre), staggered so somewhere on the panel blinks every
 *  couple of seconds. Sizes stay small so they read as contacts, not
 *  markers. */
const BLIPS = [
  { left: "16%", top: "38%", size: 7, delay: 0.6 },
  { left: "82%", top: "32%", size: 8, delay: 2.9 },
  { left: "12%", top: "74%", size: 8, delay: 5.1 },
  { left: "87%", top: "78%", size: 7, delay: 7.4 },
];

/** One column of the queue: logo above bare ticker. Active gets the amber
 *  ring + full strength; the rest wait dimmed. inline-flex on the ring
 *  wrapper so it hugs the logo's square box — on a bare inline span the ring
 *  traces the line-box and renders as an oval. Pure CSS transitions keyed
 *  off the shared activeIndex — nothing here owns a clock. */
function QueueItem({ ticker, active }: { ticker: string; active: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span
        className={`inline-flex rounded-full transition-all duration-500 ${
          active
            ? "scale-110 ring-2 ring-brand-amber"
            : "scale-100 opacity-50 ring-2 ring-transparent"
        }`}
      >
        <CompanyLogo size={36} ticker={ticker} />
      </span>
      <span
        className={`font-mono text-[9px] font-semibold uppercase tracking-[0.08em] transition-colors duration-500 ${
          active ? "text-white" : "text-white/40"
        }`}
      >
        {ticker.replace(/\.L$/, "")}
      </span>
    </div>
  );
}

export function HeroDealShowcase({ radar }: { radar: DealRadar }) {
  return (
    <div className="relative flex h-[480px] flex-col overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-[#241c12] to-[#15100a] p-6 shadow-[0_28px_64px_-30px_rgba(60,40,20,0.55)] dark:border-white/[0.10] dark:shadow-[0_28px_64px_-30px_rgba(0,0,0,0.85)]">
      <style>{`
        /* Concentric radar rings in the brand amber, centred where the
           notification stack sits so new cards read as contacts the sweep
           picked up. The outer rings run past the frame and are clipped by
           it — the panel is a window onto the sweep, not a diagram of it. */
        .hds-rings { position: absolute; left: 50%; top: 60%; }
        .hds-ring {
          position: absolute; border-radius: 50%;
          transform: translate(-50%, -50%);
          border: 1px solid rgba(238, 197, 132, 0.16);
        }
        .hds-ring:nth-child(2) { opacity: 0.75; }
        .hds-ring:nth-child(3) { opacity: 0.55; }
        .hds-ring:nth-child(4) { opacity: 0.38; }
        .hds-ring:nth-child(5) { opacity: 0.22; }

        /* A faint warm glow pooled at the rings' origin so the surface reads
           lit, not flat. */
        .hds-glow {
          position: absolute; inset: 0;
          background: radial-gradient(ellipse 70% 55% at 50% 60%,
            rgba(238, 197, 132, 0.10) 0%,
            rgba(238, 197, 132, 0.04) 40%,
            transparent 70%);
        }

        /* Disclosure blips — amber on the dark surface (the market-hero
           versions theme by page mode; this panel is dark in both). The
           keyframes are the hero's, which always renders on these pages. */
        .hds-blip {
          position: absolute; border-radius: 50%; pointer-events: none;
          opacity: 0; background: #eec584;
          will-change: opacity, transform;
          animation: hero-pulse-dot 9s ease-out infinite;
        }
        .hds-blip-ring {
          position: absolute; inset: 0; border-radius: 50%;
          opacity: 0; border: 1.5px solid rgba(238, 197, 132, 0.7);
          will-change: opacity, transform;
          animation: hero-pulse-ring 9s ease-out infinite;
          animation-delay: inherit;
        }
        .hds-blip-ring-2 { animation-name: hero-pulse-ring-2; }
        @media (prefers-reduced-motion: reduce) {
          .hds-blip { animation: none; opacity: 0.25; }
          .hds-blip-ring { display: none; }
        }
      `}</style>

      {/* Radar backdrop. */}
      <div aria-hidden className="hds-glow pointer-events-none" />
      <div aria-hidden className="hds-rings pointer-events-none">
        {[120, 230, 340, 460, 590].map((d) => (
          <span key={d} className="hds-ring" style={{ width: d, height: d }} />
        ))}
      </div>
      {BLIPS.map((p) => (
        <span
          key={`${p.left}-${p.top}`}
          aria-hidden
          className="hds-blip"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}s`,
          }}
        >
          <span className="hds-blip-ring" />
          <span className="hds-blip-ring hds-blip-ring-2" />
        </span>
      ))}

      {/* Company queue — a glass capsule on the dark surface, same material
          language as the floating navbar. */}
      <div className="pointer-events-none relative z-10 flex justify-center">
        <div className="flex items-start gap-4 rounded-2xl border border-white/[0.10] bg-white/[0.07] px-4 py-2.5 backdrop-blur-md">
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

      {/* Instrument caption — grounds the foot of the panel and says what
          the reader is looking at. */}
      <p className="pointer-events-none relative z-10 text-center font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-white/35">
        Sample alerts · drawn from real filings
      </p>
    </div>
  );
}
