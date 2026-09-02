/** The success story's last beat as a line of text, for surfaces that show
 *  the notification without the chart — the mobile hero and the compact
 *  desktop range, where the chart is dropped rather than cramped.
 *
 *  "↗ Up 135% in 107 days since the alert." Same figures as the chart's
 *  stamp (`outcomeOf`), same clock: keyed by tick so it re-mounts and lands a
 *  beat after the notification does, the way the stamp waits for the
 *  continuation to draw. Rendered inside the stack's own fade-out wrapper so
 *  it goes away with the alert while the next story is pending. */
import type { HeroDeal } from "./hero-deal-data";

import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/20/solid";

import { formatHold, outcomeOf } from "./hero-deal-data";
import { POST_MS } from "./hero-deal-radar";

export function HeroOutcomeLine({
  deal,
  tick,
  className = "",
}: {
  deal: HeroDeal;
  /** The radar's alert counter — a new value replays the landing. */
  tick: number;
  className?: string;
}) {
  const { pct, days } = outcomeOf(deal);

  if (pct === 0) return null;
  const up = pct > 0;
  const Icon = up ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;

  return (
    <p
      key={tick}
      className={`hol flex items-center justify-center gap-1.5 text-[15px] leading-none ${className}`}
      style={{ "--hol-delay": `${POST_MS}ms` } as React.CSSProperties}
    >
      <style>{`
        .hol {
          opacity: 0;
          animation: hol-in 420ms cubic-bezier(0.22, 1, 0.36, 1) var(--hol-delay) forwards;
        }
        @keyframes hol-in {
          0%   { opacity: 0; transform: translateY(5px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hol { opacity: 1; animation: none; }
        }
      `}</style>
      <Icon
        aria-hidden
        className={`h-4 w-4 shrink-0 ${up ? "text-positive" : "text-foreground/50"}`}
      />
      <span
        className={`font-semibold tabular-nums ${up ? "text-positive" : "text-foreground/60"}`}
      >
        {up ? "Up" : "Down"} {Math.abs(pct)}%
      </span>
      <span className="text-foreground/55">
        in {formatHold(days)} since the alert
      </span>
    </p>
  );
}
