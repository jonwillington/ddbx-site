/** The success story's last beat, said out loud: "Up 135% in 107 days since
 *  the alert." Two forms, same figures (`outcomeOf`), same clock.
 *
 *  `HeroOutcomeBar` is the desktop card's: a full-width tinted row seated
 *  under the chart, so the payoff is the most visible object in the demo
 *  half rather than a footer inside the chart. Keyed by the radar's cycle
 *  like the chart above it, it stamps in the moment the continuation
 *  finishes drawing — show what followed, then say it.
 *
 *  `HeroOutcomeLine` is for surfaces that show the notification without the
 *  chart — the mobile hero. A line of text under the alert, keyed by tick so
 *  it re-mounts and lands a beat after the notification does. Rendered
 *  inside the stack's own fade-out wrapper so it goes away with the alert
 *  while the next story is pending. */
import type { HeroDeal } from "./hero-deal-data";

import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/20/solid";

import { formatHold, outcomeOf } from "./hero-deal-data";
import { DRAW_MS, POST_MS } from "./hero-deal-radar";

export function HeroOutcomeBar({ deal }: { deal: HeroDeal }) {
  const { pct, days } = outcomeOf(deal);

  if (pct === 0) return null;
  const up = pct > 0;
  const Icon = up ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;

  return (
    <div
      className={`hob flex w-full items-center gap-3 rounded-2xl border px-4 py-3 ${
        up
          ? "border-positive/20 bg-positive/[0.08] dark:border-positive/25 dark:bg-positive/10"
          : "border-hairline bg-sheet/60 dark:border-white/10"
      }`}
      style={{ "--hob-delay": `${DRAW_MS + POST_MS}ms` } as React.CSSProperties}
    >
      <style>{`
        .hob {
          opacity: 0;
          animation: hob-in 420ms cubic-bezier(0.22, 1, 0.36, 1) var(--hob-delay) forwards;
        }
        @keyframes hob-in {
          0%   { opacity: 0; transform: translateY(6px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hob { opacity: 1; animation: none; }
        }
      `}</style>
      <Icon
        aria-hidden
        className={`h-5 w-5 shrink-0 ${up ? "text-positive" : "text-foreground/50"}`}
      />
      <span
        className={`font-mono text-[22px] font-semibold leading-none tabular-nums ${
          up ? "text-positive" : "text-foreground/60"
        }`}
      >
        {up ? "+" : ""}
        {pct}%
      </span>
      <span className="text-[14px] leading-tight text-foreground/65">
        in {formatHold(days)} since the alert
      </span>
    </div>
  );
}

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
