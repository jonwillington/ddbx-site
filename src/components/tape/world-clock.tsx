/** The tape's proof object: five exchanges, their local clocks, and one
 *  24-hour band drawn in the READER's time so the sessions are seen to be
 *  staggered rather than told to be. Seoul's bar sits where the reader's
 *  night is; that is the whole argument for a multi-market product, made in
 *  one picture.
 *
 *  Contained, not blended (design language, tenet 1): one rounded hairline
 *  panel on the page ground, the cells inside it hairline-ruled, no wash.
 *  The only colour is the live green every market surface already uses for
 *  "trading now", and it is used for exactly that: an open session's bar and
 *  its dot. Closed sessions are drawn in ink at low alpha; a session that is
 *  not happening today at all (weekend, holiday) is drawn hollow, because a
 *  filled bar for a day the exchange is shut would be a picture of nothing.
 *
 *  Status comes from the same state machine the dashboards use
 *  (`marketStatus`) with each market's own holiday calendar layered on. Korea
 *  has no calendar in the codebase yet, so its status is weekday-and-hours
 *  only; the doc lists that as a data-side need.
 *
 *  The clock ticks every second in one small component so the rest of the
 *  page does not re-render with it. The status line re-evaluates on the same
 *  tick, which is how a cell flips from "opens in 4m" to "open" without a
 *  reload. Nothing about the LIST moves on this clock: the panel is the one
 *  thing on the page allowed to be alive by itself.
 */
import type { FlagComponent } from "country-flag-icons/react/3x2";
import type { TapeFeeds, TapeMarket, TapeMarketId } from "../../../shared/tape";
import type { HolidaySource } from "@/lib/bank-holidays";
import type { MarketSession, MarketStatus } from "@/lib/market-status";

import { useEffect, useMemo, useState } from "react";
import { GB, KR, NL, SE, US } from "country-flag-icons/react/3x2";

import { formatDayShort, TAPE_MARKETS, todayIn } from "../../../shared/tape.js";

import { Skeleton } from "@/components/skeleton";
import { eyebrow } from "@/components/ui/eyebrow";
import { panel } from "@/components/ui/panel";
import {
  UK_BANK_HOLIDAYS_SOURCE,
  useExchangeHolidays,
} from "@/lib/bank-holidays";
import {
  formatCloseTime,
  formatCountdown,
  LSE,
  marketStatus,
  reopensPhrase,
} from "@/lib/market-status";
import { KRX_SESSION } from "@/lib/markets/korea";
import {
  EURONEXT_AMSTERDAM,
  NL_EXCHANGE_HOLIDAYS,
} from "@/lib/markets/netherlands";
import { NASDAQ_STOCKHOLM, SE_EXCHANGE_HOLIDAYS } from "@/lib/markets/sweden";
import { NYSE, US_EXCHANGE_HOLIDAYS } from "@/lib/markets/us";

export const TAPE_FLAGS: Record<TapeMarketId, FlagComponent> = {
  KR,
  SE,
  NL,
  UK: GB,
  US,
};

const SESSIONS: Record<TapeMarketId, MarketSession> = {
  KR: KRX_SESSION,
  SE: NASDAQ_STOCKHOLM,
  NL: EURONEXT_AMSTERDAM,
  UK: LSE,
  US: NYSE,
};

/** Korea has no exchange calendar in this codebase yet. An empty map means
 *  weekday-and-hours only, which the doc names as a gap rather than hiding. */
const NO_HOLIDAYS: HolidaySource = { kind: "static", map: {} };

const HOLIDAYS: Record<TapeMarketId, HolidaySource> = {
  KR: NO_HOLIDAYS,
  SE: SE_EXCHANGE_HOLIDAYS,
  NL: NL_EXCHANGE_HOLIDAYS,
  UK: UK_BANK_HOLIDAYS_SOURCE,
  US: US_EXCHANGE_HOLIDAYS,
};

const MINUTES_IN_DAY = 24 * 60;

function useTickingNow(intervalMs: number): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), intervalMs);

    return () => window.clearInterval(t);
  }, [intervalMs]);

  return now;
}

/** Wall-clock minutes since local midnight in `timeZone`. */
function wallMinutes(now: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) =>
    Number(parts.find((p) => p.type === t)?.value ?? 0);

  return (get("hour") % 24) * 60 + get("minute");
}

/** Minutes east of UTC for `timeZone` at `now`. Derived from the wall clock
 *  rather than looked up, so DST is whatever Intl says it is today. */
function tzOffsetMinutes(now: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) =>
    Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
  );
  const truncated = Math.floor(now.getTime() / 60_000) * 60_000;

  return Math.round((asUtc - truncated) / 60_000);
}

function visitorZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function clockText(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
}

/** One line under the clock. Same vocabulary as the dashboards' anchor card,
 *  compressed to a cell. */
function statusLine(status: MarketStatus, session: MarketSession): string {
  if (status.kind === "open") {
    return status.earlyCloseToday
      ? `Open · early close ${formatCloseTime(session.halfDayCloseMinute ?? session.closeMinute)}`
      : `Open · closes ${formatCloseTime(session.closeMinute)}`;
  }
  if (status.kind === "preOpen")
    return `Opens in ${formatCountdown(status.opensInMs)}`;
  if (status.reason.kind === "holiday") return `Closed · ${status.reason.name}`;
  if (status.reason.kind === "weekend")
    return `Weekend · reopens ${reopensPhrase(status.reopens)}`;

  return `Closed · reopens ${reopensPhrase(status.reopens)}`;
}

interface CellView {
  market: TapeMarket;
  status: MarketStatus;
  /** Shut for the whole calendar day. */
  shut: boolean;
  clock: string;
  line: string;
  today: number | null;
  /** The newest disclosure date the feed holds, for a day with none. */
  latest: string | null;
  feedState: "loading" | "ok" | "failed";
}

function useMarketViews(now: Date, feeds: TapeFeeds | null): CellView[] {
  // Fixed order, fixed count: five hook calls, always the same five.
  const krHolidays = useExchangeHolidays(HOLIDAYS.KR);
  const seHolidays = useExchangeHolidays(HOLIDAYS.SE);
  const nlHolidays = useExchangeHolidays(HOLIDAYS.NL);
  const ukHolidays = useExchangeHolidays(HOLIDAYS.UK);
  const usHolidays = useExchangeHolidays(HOLIDAYS.US);
  const holidays: Record<TapeMarketId, Record<string, string>> = {
    KR: krHolidays,
    SE: seHolidays,
    NL: nlHolidays,
    UK: ukHolidays,
    US: usHolidays,
  };

  return (TAPE_MARKETS as TapeMarket[]).map((market) => {
    const session = SESSIONS[market.id];
    const status = marketStatus(session, now, holidays[market.id]);
    const feed = feeds?.[market.id];
    const todayIso = todayIn(market.timeZone, now);

    return {
      market,
      status,
      shut: status.kind === "closed" && status.reason.kind !== "afterHours",
      clock: clockText(now, market.timeZone),
      line: statusLine(status, session),
      today:
        feed && feed.status === "ok"
          ? feed.rows.filter((r) => r.disclosedDate === todayIso).length
          : null,
      latest:
        feed && feed.status === "ok"
          ? feed.rows.reduce<string | null>(
              (max, r) =>
                max == null || r.disclosedDate > max ? r.disclosedDate : max,
              null,
            )
          : null,
      feedState: !feeds ? "loading" : feed?.status === "ok" ? "ok" : "failed",
    };
  });
}

function LiveDot({ live }: { live: boolean }) {
  if (!live) {
    return (
      <span
        aria-hidden
        className="inline-flex h-2 w-2 shrink-0 rounded-full bg-foreground/25"
      />
    );
  }

  return (
    <span aria-hidden className="relative inline-flex h-2 w-2 shrink-0">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live opacity-70 motion-reduce:hidden" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-live" />
    </span>
  );
}

function MarketCell({ view }: { view: CellView }) {
  const Flag = TAPE_FLAGS[view.market.id];
  const live = view.status.kind === "open";

  return (
    <li className="min-w-0 rounded-control border border-rule px-3.5 py-3">
      <div className="flex items-center gap-2">
        <Flag aria-hidden className="h-3 w-[18px] shrink-0 rounded-mark" />
        <span className="min-w-0 truncate eyebrow text-foreground/60">
          {view.market.city}
        </span>
        <span className="ml-auto">
          <LiveDot live={live} />
        </span>
      </div>
      <div
        className={`mt-2 text-figure font-semibold tabular-nums ${
          live ? "text-foreground" : "text-foreground/75"
        }`}
      >
        {view.clock}
      </div>
      <div
        className={`mt-1.5 truncate text-caption ${
          live ? "font-medium text-live" : "text-foreground/55"
        }`}
        title={view.line}
      >
        {view.line}
      </div>
      <div className="mt-2 text-small text-foreground/70">
        {view.feedState === "loading" ? (
          <Skeleton className="inline-block" h={12} w={72} />
        ) : view.feedState === "failed" ? (
          <span className="text-foreground/45">Feed not loaded</span>
        ) : view.today === 0 ? (
          // Not "nothing today": the Dutch feed's newest row was nine days
          // old on the day this shipped, and a cell that says "yet" about
          // that is promising something. The last date is a fact.
          <span className="text-foreground/45">
            {view.latest
              ? `Latest filing ${formatDayShort(view.latest)}`
              : "Nothing on the feed"}
          </span>
        ) : (
          <>
            <span className="font-semibold tabular-nums text-foreground">
              {view.today}
            </span>{" "}
            {view.today === 1 ? "filing" : "filings"} today
          </>
        )}
      </div>
    </li>
  );
}

interface Segment {
  left: number;
  width: number;
}

/** A session in the reader's frame, as 0–1 fractions of the day. Wraps into
 *  two pieces when the reader's midnight falls inside it, which is what
 *  Seoul does for a reader in New York. */
function segments(market: TapeMarket, now: Date, visitorTz: string): Segment[] {
  const shift =
    tzOffsetMinutes(now, visitorTz) - tzOffsetMinutes(now, market.timeZone);
  const mod = (n: number) =>
    ((n % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
  const open = mod(market.open + shift);
  const close = mod(market.close + shift);

  if (open < close)
    return [
      { left: open / MINUTES_IN_DAY, width: (close - open) / MINUTES_IN_DAY },
    ];

  return [
    {
      left: open / MINUTES_IN_DAY,
      width: (MINUTES_IN_DAY - open) / MINUTES_IN_DAY,
    },
    { left: 0, width: close / MINUTES_IN_DAY },
  ];
}

function Band({
  views,
  now,
  visitorTz,
}: {
  views: CellView[];
  now: Date;
  visitorTz: string;
}) {
  const needle = wallMinutes(now, visitorTz) / MINUTES_IN_DAY;
  const zoneLabel = useMemo(
    () => visitorTz.split("/").pop()?.replace(/_/g, " ") ?? "local",
    [visitorTz],
  );

  return (
    <div className="mt-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="eyebrow text-foreground/45">
          The trading day, in your time
        </p>
        <p className="text-caption tabular-nums text-foreground/45">
          Now {clockText(now, visitorTz)} {zoneLabel}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3">
        {/* Lane labels. */}
        <ol className="space-y-1.5 pt-px">
          {views.map((v) => {
            const Flag = TAPE_FLAGS[v.market.id];

            return (
              <li key={v.market.id} className="flex h-3 items-center">
                <Flag aria-hidden className="h-2.5 w-[15px] rounded-mark" />
                <span className="sr-only">{v.market.city}</span>
              </li>
            );
          })}
        </ol>

        {/* Lanes, on a ruled track. */}
        <div className="relative">
          {/* Six-hour rules. */}
          {[0.25, 0.5, 0.75].map((f) => (
            <span
              key={f}
              aria-hidden
              className="absolute inset-y-0 w-px bg-foreground/[0.07]"
              style={{ left: `${f * 100}%` }}
            />
          ))}
          <ol className="relative space-y-1.5 pt-px">
            {views.map((v) => {
              const live = v.status.kind === "open";

              return (
                <li key={v.market.id} className="relative h-3">
                  <span
                    aria-hidden
                    className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-foreground/[0.06]"
                  />
                  {segments(v.market, now, visitorTz).map((s, i) => (
                    <span
                      key={i}
                      aria-hidden
                      className={`absolute inset-y-0 rounded-mark ${
                        v.shut
                          ? "border border-dashed border-foreground/25"
                          : live
                            ? "bg-live"
                            : "bg-foreground/20"
                      }`}
                      style={{
                        left: `${s.left * 100}%`,
                        width: `${Math.max(s.width * 100, 0.4)}%`,
                      }}
                    />
                  ))}
                  <span className="sr-only">
                    {v.market.city}{" "}
                    {v.shut
                      ? "does not trade today"
                      : live
                        ? "is trading now"
                        : "is closed now"}
                  </span>
                </li>
              );
            })}
          </ol>

          {/* The needle: now, in the reader's day. */}
          <span
            aria-hidden
            className="absolute -top-1 -bottom-1 w-px bg-foreground"
            style={{ left: `${needle * 100}%` }}
          />
        </div>
      </div>

      <div className="mt-1.5 grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3">
        <span />
        <div className="relative h-4 text-[10px] tabular-nums text-foreground/40">
          {[0, 6, 12, 18].map((h) => (
            <span
              key={h}
              className="absolute -translate-x-1/2"
              style={{ left: `${(h / 24) * 100}%` }}
            >
              {String(h).padStart(2, "0")}:00
            </span>
          ))}
          <span className="absolute right-0">24:00</span>
        </div>
      </div>
    </div>
  );
}

export function WorldClock({ feeds }: { feeds: TapeFeeds | null }) {
  const now = useTickingNow(1000);
  const views = useMarketViews(now, feeds);
  const visitorTz = useMemo(visitorZone, []);
  const open = views.filter((v) => v.status.kind === "open").length;

  return (
    <section aria-label="Market clocks" className={`${panel()} p-4 sm:p-5`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className={eyebrow()}>Five exchanges</p>
        <p className="text-small text-foreground/55">
          {open === 0
            ? "None trading right now"
            : open === 1
              ? "One trading right now"
              : `${open} trading right now`}
        </p>
      </div>

      {/* Five cells in two phone columns leave one orphan; it takes the
          row. At three columns the last row is two cells, which is fine. */}
      <ol className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 [&>li:last-child]:col-span-2 sm:[&>li:last-child]:col-span-1">
        {views.map((v) => (
          <MarketCell key={v.market.id} view={v} />
        ))}
      </ol>

      <Band now={now} views={views} visitorTz={visitorTz} />
    </section>
  );
}
