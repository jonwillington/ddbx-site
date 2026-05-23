import type { HolidaySource } from "@/lib/bank-holidays";
import type { MarketSession, MarketStatus } from "@/lib/market-status";

import { useEffect, useState } from "react";
import { CalendarIcon, ClockIcon } from "@heroicons/react/24/outline";

import { useExchangeHolidays } from "@/lib/bank-holidays";
import {
  formatCloseTime,
  formatCountdown,
  marketStatus,
} from "@/lib/market-status";

export interface MarketStatusView {
  eyebrow: string;
  headline: string;
  sub: string | null;
  icon: "calendar" | "clock";
  dotClass: string;
  isLive: boolean;
  /** Set on weekend/holiday closures — the whole calendar day is shut.
   *  Callers use this to suppress the "Today · SATURDAY" header (it
   *  doesn't add anything on a no-trade day) and to swap copy elsewhere
   *  if they want to. `null` for live / pre-open / after-hours. */
  closureKind: "weekend" | "afterHours" | "holiday" | null;
}

/** Empty-map fallback so the hook below can stay unconditional when a
 *  caller has no holiday source on hand. */
const NOOP_HOLIDAY_SOURCE: HolidaySource = { kind: "static", map: {} };

/** Single source of truth for "what's the market doing" — feeds both
 *  the standalone bordered anchor card (busy days, top of section) and
 *  the empty-day panel embedded inside the shared container alongside
 *  the "biggest gainers" grid. Tolerates missing session/holidays so
 *  callers can call it unconditionally and let the result decide what
 *  to render. Re-evaluates every minute so the card ticks pre-open →
 *  live → after-hours without a reload. */
export function useMarketStatusView(
  session: MarketSession | undefined,
  holidaySource: HolidaySource | undefined,
): MarketStatusView | null {
  const holidays = useExchangeHolidays(holidaySource ?? NOOP_HOLIDAY_SOURCE);
  const now = useTickingNow(60_000);

  if (!session) return null;

  const status = marketStatus(session, now, holidays);

  return describeStatus(status, session);
}

/** Standalone bordered anchor — used above today's deal cards on busy
 *  days. On empty days the Today hero instead drops this card's content
 *  into a shared container with the gainers grid, via
 *  `MarketAnchorPanel`. */
export function MarketAnchorCard({ view }: { view: MarketStatusView }) {
  return (
    <div
      className={`relative flex h-full flex-col overflow-hidden rounded-xl border p-6 transition-colors md:p-8 ${
        view.isLive
          ? "border-[#2E7D32]/30 bg-[#2E7D32]/[0.06] dark:bg-[#2E7D32]/[0.15]"
          : "border-black/[0.08] bg-[#faf7f2] dark:border-white/[0.08] dark:bg-surface"
      }`}
    >
      {view.isLive && <LiveWash />}
      <MarketAnchorPanel view={view} />
    </div>
  );
}

/** Bare content of the anchor — eyebrow chip, big headline, sub. No
 *  outer border / radius / background so it can be embedded inside the
 *  shared empty-day container without doubling-up chrome. */
export function MarketAnchorPanel({ view }: { view: MarketStatusView }) {
  return (
    <>
      <div className="relative flex items-center gap-2">
        <StatusBullet
          dotClass={view.dotClass}
          icon={view.icon}
          isLive={view.isLive}
        />
        <span
          className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${
            view.isLive ? "text-[#2E7D32] dark:text-[#7BBE7F]" : "text-muted"
          }`}
        >
          {view.eyebrow}
        </span>
      </div>
      <div className="relative mt-4 flex-1 text-[28px] font-semibold leading-[1.1] tracking-[-0.035em] md:text-[34px]">
        {view.headline}
      </div>
      {view.sub && (
        <div className="relative mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
          {view.sub}
        </div>
      )}
    </>
  );
}

export function LiveWash() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 animate-today-live-wash bg-[radial-gradient(circle_at_top_left,rgba(46,125,50,0.18),transparent_70%)]"
    />
  );
}

function StatusBullet({
  isLive,
  icon,
  dotClass,
}: {
  isLive: boolean;
  icon: "calendar" | "clock";
  dotClass: string;
}) {
  if (isLive) {
    return (
      <span
        aria-hidden
        className="relative inline-flex h-2.5 w-2.5 shrink-0"
      >
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2E7D32] opacity-70" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#2E7D32]" />
      </span>
    );
  }

  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground/5 ${dotClass.replace("bg-", "text-")}`}
    >
      {icon === "calendar" ? (
        <CalendarIcon className="h-3.5 w-3.5" />
      ) : (
        <ClockIcon className="h-3.5 w-3.5" />
      )}
    </span>
  );
}

function describeStatus(
  status: MarketStatus,
  session: MarketSession,
): MarketStatusView {
  if (status.kind === "open") {
    return {
      eyebrow: "Live",
      headline: "Scanning the market for deals",
      sub: status.earlyCloseToday
        ? `Early close at ${formatCloseTime(session.halfDayCloseMinute ?? session.closeMinute)} (${status.earlyCloseToday})`
        : `Closes at ${formatCloseTime(session.closeMinute)}`,
      icon: "clock",
      dotClass: "bg-[#2E7D32]",
      isLive: true,
      closureKind: null,
    };
  }
  if (status.kind === "preOpen") {
    return {
      eyebrow: "Pre-open",
      headline: `Market opens in ${formatCountdown(status.opensInMs)}`,
      sub: `Opens at ${formatCloseTime(session.openMinute)}`,
      icon: "clock",
      dotClass: "bg-amber-400",
      isLive: false,
      closureKind: null,
    };
  }
  const reopens =
    status.reopens.kind === "tomorrow"
      ? "Reopens tomorrow"
      : `Reopens ${status.reopens.day}`;

  if (status.reason.kind === "holiday") {
    return {
      eyebrow: "Closed",
      headline: `Closed for ${status.reason.name}`,
      sub: reopens,
      icon: "calendar",
      dotClass: "bg-foreground/30",
      isLive: false,
      closureKind: "holiday",
    };
  }
  if (status.reason.kind === "weekend") {
    return {
      eyebrow: "Closed",
      headline: "Markets closed for the weekend",
      sub: reopens,
      icon: "calendar",
      dotClass: "bg-foreground/30",
      isLive: false,
      closureKind: "weekend",
    };
  }

  return {
    eyebrow: "Closed",
    headline: "The market has closed",
    sub: reopens,
    icon: "clock",
    dotClass: "bg-foreground/30",
    isLive: false,
    closureKind: "afterHours",
  };
}

/** Returns `new Date()` and re-renders every `intervalMs`. Keeps the
 *  pre-open countdown honest and flips the card from pre-open → live
 *  → after-hours without a reload. */
function useTickingNow(intervalMs: number): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);

    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
