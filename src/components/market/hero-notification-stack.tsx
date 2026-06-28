/** iOS-style notification stack for the hero "deal radar". Driven by the shared
 *  `tick` clock so the front card is always the deal the map is beaconing — the
 *  two read as one live feed.
 *
 *  Layout (everything on one centre axis, so it aligns with the App Store button
 *  below it):
 *    - the front card is full width — same width as the button beneath it;
 *    - the cards behind shrink symmetrically toward the centre and peek out the
 *      bottom and sides, like a real grouped notification stack;
 *    - the front deal's company avatar floats *above* the front card and times
 *      in/out as each new notification lands.
 *
 *  Motion is CSS transitions between discrete slots (so it can't drift out of
 *  sync with the map) plus a short enter animation on the freshly-mounted front
 *  card and its avatar; respects prefers-reduced-motion (everything rests
 *  static). Rebuilt from the original screenshot in markup — no bitmap. */
import type { HeroDeal } from "./hero-deal-data";

import { useLayoutEffect, useRef, useState } from "react";

import { CompanyLogo } from "@/components/company-logo";

/** Slot styling by depth from the front (0 = newest/front … 3 = exiting). Same
 *  width logic for all; depth is pure centre-scale, so lower cards sit
 *  concentrically beneath the front with even side rims. */
const SLOTS = [
  { width: 100, opacity: 1, zIndex: 30 },
  { width: 90, opacity: 1, zIndex: 20 },
  { width: 82, opacity: 1, zIndex: 10 },
  { width: 76, opacity: 0, zIndex: 5 },
];

/** Vertical offset of each behind card *relative to the measured front-card
 *  height*, so the rim peeking below the front is constant no matter how many
 *  lines the front notification's copy wraps to. Index 0 (the front) is pinned
 *  at y=0; the rest are `frontHeight + offset`. */
const BEHIND_Y = [0, -37, 11, 51];

/** Gap reserved below the front card so the deepest visible card's rim clears
 *  the App Store button beneath the stack. */
const STACK_TAIL = 80;

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
        /* Reserve space above the stack for the floating avatar. */
        .hns { padding-top: 92px; }
        .hns-avatar {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          z-index: 40;
          border-radius: 9999px;
          box-shadow: 0 16px 34px -10px rgba(0, 0, 0, 0.55);
          border: 3px solid rgba(255, 255, 255, 0.9);
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
          border-radius: 24px;
          padding: 13px 17px 15px;
          color: #fff;
          text-align: left;
          /* A quiet prop, not the hero of the column — the App Store CTA below
             is the focus. Lighter slate + softer shadow so the stack recedes;
             near-opaque so the textured map never bleeds through. */
          background: rgba(74, 74, 82, 0.92);
          -webkit-backdrop-filter: blur(20px) saturate(150%);
          backdrop-filter: blur(20px) saturate(150%);
          border: 0.5px solid rgba(255, 255, 255, 0.14);
          box-shadow: 0 14px 30px -16px rgba(0, 0, 0, 0.3);
        }
        /* Cards behind recede by getting a touch darker, staying opaque. Their
           content is skeletoned (below) so they read as quiet backdrop, not
           competing copy. */
        .hns-item.depth-1 .hns-card {
          background: rgba(64, 64, 72, 0.93);
          box-shadow: 0 9px 22px -16px rgba(0, 0, 0, 0.28);
        }
        .hns-item.depth-2 .hns-card {
          background: rgba(56, 56, 64, 0.94);
          box-shadow: 0 6px 16px -16px rgba(0, 0, 0, 0.24);
        }
        /* The freshly-mounted front card drops in from just above. */
        .hns-item.is-front .hns-card { animation: hns-enter 0.6s cubic-bezier(0.22, 0.61, 0.36, 1); }
        @keyframes hns-enter {
          0%   { transform: translateY(-14px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .hns-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
        .hns-item:not(.is-front) .hns-head { margin-bottom: 4px; }
        .hns-icon { width: 22px; height: 22px; border-radius: 6px; object-fit: cover; flex-shrink: 0; }
        .hns-app { font-size: 13px; font-weight: 600; letter-spacing: 0.01em; color: rgba(255, 255, 255, 0.66); }
        .hns-time { margin-left: auto; font-size: 12px; color: rgba(255, 255, 255, 0.42); }
        .hns-body { font-size: 14.5px; line-height: 1.34; color: rgba(255, 255, 255, 0.9); }
        .hns-item.depth-1 .hns-body { color: rgba(255, 255, 255, 0.72); }
        .hns-item.depth-2 .hns-body { color: rgba(255, 255, 255, 0.58); }
        .hns-lead { font-weight: 600; color: #fff; }
        .hns-item.depth-1 .hns-lead { color: rgba(255, 255, 255, 0.86); }
        .hns-item.depth-2 .hns-lead { color: rgba(255, 255, 255, 0.72); }
        .hns-bell { margin-right: 2px; }
        /* Skeleton placeholders for the cards behind — faded rounded bars
           instead of real copy so they read as quiet backdrop. */
        .hns-sk { display: block; border-radius: 6px; background: rgba(255, 255, 255, 0.12); }
        .hns-item.depth-2 .hns-sk { background: rgba(255, 255, 255, 0.09); }
        .hns-sk-icon { width: 20px; height: 20px; border-radius: 7px; flex-shrink: 0; }
        .hns-sk-app { width: 58px; height: 9px; }
        .hns-sk-line { width: 82%; height: 10px; margin-top: 2px; }
        @media (prefers-reduced-motion: reduce) {
          .hns-item, .hns-stack { transition: none; }
          .hns-item.is-front .hns-card,
          .hns-avatar { animation: none; }
        }
      `}</style>

      {/* Floating avatar for the front deal — keyed by tick so it re-mounts and
          replays its enter animation on every advance. */}
      <CompanyLogo
        key={tick}
        className="hns-avatar"
        size={76}
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
              <div className="hns-card">
                {compact ? (
                  // Cards behind: skeleton bars, no real copy — quiet backdrop.
                  <div aria-hidden>
                    <div className="hns-head">
                      <span className="hns-sk hns-sk-icon" />
                      <span className="hns-sk hns-sk-app" />
                    </div>
                    <span className="hns-sk hns-sk-line" />
                  </div>
                ) : (
                  <>
                    <div className="hns-head">
                      <img alt="" className="hns-icon" src={deal.icon} />
                      <span className="hns-app">{deal.app}</span>
                      <span className="hns-time">now</span>
                    </div>
                    <div className="hns-body">
                      <span aria-hidden className="hns-bell">
                        🔔
                      </span>
                      <span className="hns-lead">
                        {deal.tag}: {deal.lead}
                      </span>
                      . {deal.body}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
