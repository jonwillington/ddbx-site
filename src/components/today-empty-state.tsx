import type { MarketSession, MarketStatus } from "@/lib/market-status";
import type { IllustrationScene } from "@/lib/illustrations";

import { CalendarIcon, ClockIcon } from "@heroicons/react/24/outline";

import { Illustration } from "@/components/illustration";
import { sceneForStatus } from "@/lib/illustrations";
import { LSE, noDealsSubtitle, reopensPhrase } from "@/lib/market-status";

/**
 * Empty state for the "Today" section when no deals have come in yet. Mirrors
 * iOS `emptyTodayCard` — calendar icon for weekend/holiday closures, clock
 * icon for in-session "still waiting" states. `session` defaults to the LSE
 * for back-compat with UK callers; US/SE pass their own.
 */
export function TodayEmptyState({
  status,
  now = new Date(),
  variant = "card",
  session = LSE,
}: {
  status: MarketStatus;
  now?: Date;
  variant?: "card" | "inline";
  session?: MarketSession;
}) {
  const { icon, scene, headline, subtitle } = describe(status, now, session);
  const Icon = icon === "calendar" ? CalendarIcon : ClockIcon;

  if (variant === "inline") {
    return (
      <div className="px-5 py-5 text-center">
        <Illustration
          className="mx-auto mb-3"
          icon={Icon}
          iconClassName="h-5 w-5 text-muted"
          scene={scene}
        />
        <div className="text-sm font-semibold">{headline}</div>
        <div className="text-xs text-muted mt-1">{subtitle}</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-surface/60 border border-separator/60 px-4 py-7 m-4 flex flex-col items-center text-center gap-2">
      <Illustration className="mb-1" icon={Icon} scene={scene} />
      <div className="text-sm font-semibold">{headline}</div>
      <div className="text-xs text-muted leading-relaxed max-w-xs">
        {subtitle}
      </div>
    </div>
  );
}

function describe(
  status: MarketStatus,
  now: Date,
  session: MarketSession,
): {
  icon: "calendar" | "clock";
  scene: IllustrationScene;
  headline: string;
  subtitle: string;
} {
  // Picture and copy from the one status value, so they can't disagree.
  const scene = sceneForStatus(status);

  if (status.kind === "closed" && status.reason.kind === "holiday") {
    return {
      icon: "calendar",
      scene,
      headline: `Closed for ${status.reason.name}`,
      subtitle: `Reopens ${reopensPhrase(status.reopens)}.`,
    };
  }
  if (status.kind === "closed" && status.reason.kind === "weekend") {
    return {
      icon: "calendar",
      scene,
      headline: "Markets closed for the weekend",
      subtitle: "Enjoy your time off.",
    };
  }

  return {
    icon: "clock",
    scene,
    headline: "No deals have happened yet today",
    subtitle: noDealsSubtitle(session, now, status),
  };
}
