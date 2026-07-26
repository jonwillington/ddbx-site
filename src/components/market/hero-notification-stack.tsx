/** iOS-style notification stack for the hero "deal radar". Driven by the shared
 *  `tick` clock so the front card is always the deal the map is beaconing — the
 *  two read as one live feed.
 *
 *  Layout (everything on one centre axis, so it aligns with the App Store button
 *  below it):
 *    - the front card is full width — same width as the button beneath it;
 *    - the cards behind are thin rims peeking below the front card — real iOS
 *      grouped-notification geometry (~10px per rim), not half-cards;
 *    - the front deal's company avatar sits half-in / half-out over the front
 *      card's top edge, badge-style, so avatar + card read as one object; it
 *      re-mounts (and replays its pop) as each new notification lands.
 *
 *  Motion is CSS transitions between discrete slots (so it can't drift out of
 *  sync with the map) plus a short enter animation on the freshly-mounted front
 *  card and its avatar; respects prefers-reduced-motion (everything rests
 *  static). Rebuilt from the original screenshot in markup — no bitmap. */
import type { HeroDeal } from "./hero-deal-data";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { CompanyLogo } from "@/components/company-logo";

/** Default cadence for surfaces that drive the stack on their own clock.
 *  Matches the hero radar's, so every stack on the site advances at the same
 *  rate whether or not there's a map wired to it. */
const TICK_MS = 4200;

/** Standalone clock for a stack that ISN'T paired with the hero deal radar.
 *  `useDealRadar` also owns a map camera, which most callers have no use for —
 *  this is just the monotonic counter the stack needs. Frozen under
 *  prefers-reduced-motion, where the stack rests on a single card. */
export function useNotificationTick(enabled: boolean): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const id = setInterval(() => setTick((t) => t + 1), TICK_MS);

    return () => clearInterval(id);
  }, [enabled]);

  return tick;
}

/** Slot styling by depth from the front (0 = newest/front … 3 = exiting). Same
 *  width logic for all; depth is pure centre-scale, so lower cards sit
 *  concentrically beneath the front with even side rims. */
const SLOTS = [
  { width: 100, opacity: 1, zIndex: 30 },
  { width: 93, opacity: 1, zIndex: 20 },
  { width: 86, opacity: 1, zIndex: 10 },
  { width: 80, opacity: 0, zIndex: 5 },
];

/** Fixed height of the rim cards behind the front (they carry no content).
 *  Kept short so a rim only tucks a few px under the front card — the front is
 *  slightly translucent, and a card edge buried deep beneath it ghosts through
 *  as a faint outline. */
const RIM_H = 24;

/** Vertical offset of each behind card *relative to the measured front-card
 *  height*, so the rim peeking below the front is constant no matter how many
 *  lines the front notification's copy wraps to. Index 0 (the front) is pinned
 *  at y=0; the rest are `frontHeight + offset`. With RIM_H-tall cards these
 *  offsets expose ~11px and ~9px rims — thin edges, like a real grouped
 *  notification stack, not half-cards. */
const BEHIND_Y = [0, -13, -4, 3];

/** Gap reserved below the front card so the deepest visible rim's shadow
 *  clears the App Store button beneath the stack. */
const STACK_TAIL = 34;

/** How many cards are kept mounted: 3 visible slots + 1 exiting. */
const RENDERED = SLOTS.length;

export function HeroNotificationStack({
  deals,
  tick,
}: {
  deals: HeroDeal[];
  /** Monotonic advance counter from the shared radar clock. The front card is
   *  `deals[tick % deals.length]`; each increment promotes a new front. */
  tick: number;
}) {
  const n = deals.length;
  const frontDeal = deals[((tick % n) + n) % n];

  // Measure the live front card so the cards behind can be offset from its real
  // height (set before paint, so there's no flash; re-measured on resize since
  // copy re-wraps as the column narrows).
  const frontRef = useRef<HTMLDivElement | null>(null);
  const [frontH, setFrontH] = useState(96);

  useLayoutEffect(() => {
    const el = frontRef.current;

    if (!el) return;
    const measure = () => setFrontH(el.offsetHeight);

    measure();
    const ro = new ResizeObserver(measure);

    ro.observe(el);

    return () => ro.disconnect();
  }, [tick]);

  // Render the newest `RENDERED` ticks as cards. Offset 0 = front (newest),
  // higher offsets sit lower/smaller; the last is mid-exit. Keying by the card's
  // own tick means a fresh element mounts at the front each advance (so its
  // drop-in animation plays) and the oldest unmounts once it's faded out.
  const cards = Array.from({ length: RENDERED }, (_, offset) => {
    const cardTick = tick - offset;
    const deal = deals[((cardTick % n) + n) % n];

    return { cardTick, offset, deal };
  });

  return (
    <div
      aria-label={`Example ${deals[0].app} deal notifications`}
      className="hns relative w-full"
      role="img"
    >
      <style>{`
        /* Reserve space above the stack for the half of the badge avatar that
           sits above the front card's top edge. */
        .hns { padding-top: 30px; }
        .hns-avatar {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          z-index: 40;
          border-radius: 9999px;
          box-shadow: 0 10px 24px -8px rgba(0, 0, 0, 0.45);
          border: 2px solid rgba(255, 255, 255, 0.9);
          animation: hns-avatar-in 0.6s cubic-bezier(0.22, 0.61, 0.36, 1);
        }
        :is(.dark) .hns-avatar { border-color: rgba(255, 255, 255, 0.18); }
        @keyframes hns-avatar-in {
          0%   { opacity: 0; transform: translateX(-50%) translateY(8px) scale(0.7); }
          55%  { opacity: 1; }
          100% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }

        .hns-stack {
          position: relative;
          transition: height 0.6s cubic-bezier(0.22, 0.61, 0.36, 1);
        }
        .hns-item {
          position: absolute;
          left: 50%;
          top: 0;
          width: 100%;
          transform-origin: top center;
          will-change: transform, opacity;
          transition: transform 0.6s cubic-bezier(0.22, 0.61, 0.36, 1),
                      opacity 0.6s cubic-bezier(0.22, 0.61, 0.36, 1),
                      width 0.6s cubic-bezier(0.22, 0.61, 0.36, 1);
        }
        .hns-card {
          width: 100%;
          border-radius: 22px;
          padding: 14px 17px 15px;
          max-height: 140px;
          overflow: hidden;
          color: #fff;
          text-align: left;
          /* A quiet prop, not the hero of the column — the App Store CTA below
             is the focus. Warm-shifted dark (same temperature family as the
             dark panel tone) so the card sits in the cream/bronze frame
             instead of reading as cool slate; near-opaque so the textured map
             never bleeds through. */
          background: rgba(72, 66, 59, 0.96);
          -webkit-backdrop-filter: blur(20px) saturate(150%);
          backdrop-filter: blur(20px) saturate(150%);
          border: 0.5px solid rgba(255, 255, 255, 0.14);
          box-shadow: 0 14px 30px -16px rgba(0, 0, 0, 0.3);
          transition: max-height 0.6s cubic-bezier(0.22, 0.61, 0.36, 1),
                      background 0.6s cubic-bezier(0.22, 0.61, 0.36, 1);
        }
        /* Cards behind collapse to bare rims — no content, fixed height — and
           recede by getting a touch darker while staying opaque. The max-height
           transition lets the outgoing front card shrink into its rim instead
           of snapping. */
        .hns-item:not(.is-front) .hns-card {
          padding: 0;
          min-height: ${RIM_H}px;
          max-height: ${RIM_H}px;
        }
        .hns-item.depth-1 .hns-card {
          background: rgba(63, 58, 52, 0.93);
          box-shadow: 0 9px 22px -16px rgba(0, 0, 0, 0.28);
        }
        .hns-item.depth-2 .hns-card {
          background: rgba(55, 50, 45, 0.94);
          box-shadow: 0 6px 16px -16px rgba(0, 0, 0, 0.24);
        }
        /* The freshly-mounted front card drops in from just above. */
        .hns-item.is-front .hns-card { animation: hns-enter 0.6s cubic-bezier(0.22, 0.61, 0.36, 1); }
        @keyframes hns-enter {
          0%   { transform: translateY(-14px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .hns-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
        .hns-icon { width: 22px; height: 22px; border-radius: 6px; object-fit: cover; flex-shrink: 0; }
        .hns-app { font-size: 13px; font-weight: 600; letter-spacing: 0.01em; color: rgba(255, 255, 255, 0.66); }
        .hns-time { margin-left: auto; font-size: 12px; color: rgba(255, 255, 255, 0.42); }
        .hns-body { font-size: 14.5px; line-height: 1.34; color: rgba(255, 255, 255, 0.9); }
        .hns-lead { font-weight: 600; color: #fff; }
        /* The attention tag ("BREAKING", "JUST IN") — a warm-gold small-caps
           accent instead of the old bell emoji, so the alert cue reads
           editorial rather than cartoon. */
        .hns-tag {
          margin-right: 6px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #eec584;
        }
        @media (prefers-reduced-motion: reduce) {
          .hns-item, .hns-stack, .hns-card { transition: none; }
          .hns-item.is-front .hns-card,
          .hns-avatar { animation: none; }
        }
      `}</style>

      {/* Badge avatar for the front deal — half-in / half-out over the card's
          top edge; keyed by tick so it re-mounts and replays its enter
          animation on every advance. */}
      <CompanyLogo
        key={tick}
        className="hns-avatar"
        size={56}
        ticker={frontDeal.ticker}
      />

      <div className="hns-stack" style={{ height: frontH + STACK_TAIL }}>
        {cards.map(({ cardTick, offset, deal }) => {
          const slot = SLOTS[offset];
          const compact = offset > 0;
          const y = offset === 0 ? 0 : frontH + BEHIND_Y[offset];

          return (
            <div
              key={cardTick}
              ref={offset === 0 ? frontRef : undefined}
              className={`hns-item depth-${Math.min(offset, 2)}${offset === 0 ? " is-front" : ""}`}
              style={{
                transform: `translate(-50%, ${y}px)`,
                width: `${slot.width}%`,
                opacity: slot.opacity,
                zIndex: slot.zIndex,
              }}
            >
              {compact ? (
                // Cards behind: bare rims, no content — quiet backdrop.
                <div aria-hidden className="hns-card" />
              ) : (
                <div className="hns-card">
                  <div className="hns-head">
                    <img alt="" className="hns-icon" src={deal.icon} />
                    <span className="hns-app">{deal.app}</span>
                    <span className="hns-time">now</span>
                  </div>
                  <div className="hns-body">
                    <span className="hns-tag">{deal.tag}</span>
                    <span className="hns-lead">{deal.lead}</span>. {deal.body}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
