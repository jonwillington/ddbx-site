/** The tape itself: one `BoardRow` per filing, day rules between days, and
 *  the "since you last looked" marker where the previous visit ended.
 *
 *  Rows are BoardRow with no lead: a tape is not ranked and the date lead is
 *  a day, not a time, so the day is said once on the rule above each run of
 *  rows and the time-of-day is a fact cell on the row. On a phone the facts
 *  fold into the caption under the name, as every board's do, and the one
 *  right-hand column is the size.
 *
 *  Colour carries meaning and nothing else: the side reads in the site's
 *  own directional pair (bought green, sold red) and everything else is ink.
 *  The verdict column is the same RatingBadge every other surface draws, so
 *  a Significant here is the Significant on the filing page; where a market
 *  has no rating layer at all the cell says so in words, because an empty
 *  cell would read as "not rated" about a filing when it is a fact about a
 *  country.
 */
import type { TapeRow } from "../../../shared/tape";

import { Fragment, useMemo, useState } from "react";

import {
  formatDayLong,
  formatGbpApprox,
  formatNative,
  rowClock,
  tapeMarket,
  tapeRowHref,
} from "../../../shared/tape.js";

import {
  BoardRow,
  BoardRowHeader,
  BoardRowList,
} from "@/components/boards/board-row";
import { CompanyLogo } from "@/components/company-logo";
import { RatingBadge } from "@/components/rating-badge";
import { R } from "@/components/sector-ui";
import { TAPE_FLAGS } from "@/components/tape/world-clock";
import { TickerPill } from "@/components/ticker-pill";

/** Rows drawn before the reader asks for the rest. A week of five markets
 *  is 250 rows of 76px; the first eighty is two days, which is what a tape
 *  is for, and the rest is a press away rather than a scroll of a mile. */
const INITIAL = 80;

const SIDE_CLASS: Record<TapeRow["side"], string> = {
  buy: "font-semibold text-positive",
  sell: "font-semibold text-negative",
  other: "text-foreground/70",
};

function Verdict({ row }: { row: TapeRow }) {
  switch (row.ratingState) {
    case "rated":
      return <RatingBadge rating={row.rating as "significant"} />;
    case "skipped":
      return <RatingBadge rating="skipped" />;
    case "reviewing":
      return (
        <span className="text-[11px] leading-[1.35] text-foreground/55">
          In review
        </span>
      );
    case "no-layer":
      return (
        <span
          className="text-[11px] leading-[1.35] text-foreground/45"
          title={`${tapeMarket(row.market)?.name ?? row.market} has no rating layer yet`}
        >
          Unrated market
        </span>
      );
    default:
      return (
        <span className="text-[11px] leading-[1.35] text-foreground/45">
          Not yet rated
        </span>
      );
  }
}

function Money({ row }: { row: TapeRow }) {
  const native = formatNative(row.value, row.currency);

  if (!native) {
    return (
      <span className="text-[11px] font-normal text-foreground/45">
        not filed
      </span>
    );
  }
  const approx = formatGbpApprox(row.gbp);

  return (
    <>
      {native}
      {approx ? (
        <span className="mt-0.5 block text-[11px] font-normal tabular-nums text-foreground/45">
          {approx}
        </span>
      ) : null}
    </>
  );
}

function FlaggedLogo({ row }: { row: TapeRow }) {
  const Flag = TAPE_FLAGS[row.market];
  const market = tapeMarket(row.market);

  return (
    <span className="relative inline-flex">
      <CompanyLogo
        domain={row.logoDomain}
        monogramText={row.logoTicker ? undefined : row.company}
        size={56}
        ticker={row.logoTicker ?? row.ticker ?? row.company}
      />
      <Flag
        aria-hidden
        className="absolute -bottom-0.5 -right-0.5 h-3.5 w-5 rounded-[2px] ring-2 ring-background"
      />
      <span className="sr-only">{market?.name}</span>
    </span>
  );
}

function Row({ row }: { row: TapeRow }) {
  const clock = rowClock(row);
  const insider = row.insider.role
    ? `${row.insider.name}, ${row.insider.role}`
    : row.insider.name;

  return (
    <BoardRow
      badge={row.ticker ? <TickerPill ticker={row.ticker} /> : undefined}
      facts={[
        {
          label: "Side",
          value: <span className={SIDE_CLASS[row.side]}>{row.action}</span>,
        },
        {
          label: "Disclosed",
          // The fact track is 5rem: "19:00 Stockholm" does not fit and a
          // truncated city is worse than none. From `sm` the column shows
          // the time alone (the flag on the logo names the market); the
          // phone caption has the width and keeps the city.
          value: clock ? (
            <span title={clock}>
              <span className="sm:hidden">{clock}</span>
              <span className="hidden sm:inline">
                {clock.replace(/ [A-Z][^ ]*( [A-Z][^ ]*)?$/, "")}
              </span>
            </span>
          ) : (
            <span className="text-foreground/45">date only</span>
          ),
        },
      ]}
      logo={<FlaggedLogo row={row} />}
      money={<Money row={row} />}
      name={row.company}
      perf={<Verdict row={row} />}
      secondary={
        <>
          {insider}
          {row.flags.length > 0 ? (
            <span className="text-foreground/45">
              {" "}
              · {row.flags.join(" · ")}
            </span>
          ) : null}
        </>
      }
      // On the market's own domain: a US filing read from ddbx.uk opens on
      // ddbx.us, not on the noindexed copy of it that ddbx.uk would render.
      // Router's Link draws an absolute URL as a plain anchor.
      to={tapeRowHref(row, window.location.hostname) ?? undefined}
    />
  );
}

function relative(ms: number, now: number): string {
  const mins = Math.max(1, Math.round((now - ms) / 60_000));

  if (mins < 60) return `${mins} ${mins === 1 ? "minute" : "minutes"} ago`;
  const hours = Math.round(mins / 60);

  if (hours < 36) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.round(hours / 24);

  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

function DayRule({
  iso,
  rows,
  today,
}: {
  iso: string;
  rows: TapeRow[];
  today: string;
}) {
  const markets = new Set(rows.map((r) => r.market)).size;

  return (
    <li
      className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b ${R.rule} pb-2.5 pt-7 first:pt-2`}
    >
      <span className="text-[14px] font-semibold tracking-[-0.01em] text-foreground">
        {iso === today ? "Today, " : ""}
        {formatDayLong(iso)}
      </span>
      <span className="text-[11.5px] tabular-nums text-foreground/50">
        {rows.length} {rows.length === 1 ? "filing" : "filings"} · {markets}{" "}
        {markets === 1 ? "market" : "markets"}
      </span>
    </li>
  );
}

function SinceMarker({ count, when }: { count: number; when: string }) {
  return (
    <li
      aria-label={`${count} filings since you last looked, ${when}`}
      className="py-2.5"
    >
      <span className="flex items-center gap-3 font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-brand-brown dark:text-brand-tan">
        <span
          aria-hidden
          className="h-px flex-1 bg-brand-brown/35 dark:bg-brand-tan/35"
        />
        <span>
          Since you last looked, {when} · {count}{" "}
          {count === 1 ? "filing" : "filings"}
        </span>
        <span
          aria-hidden
          className="h-px flex-1 bg-brand-brown/35 dark:bg-brand-tan/35"
        />
      </span>
    </li>
  );
}

export function TapeList({
  rows,
  lastSeenAt,
  today,
}: {
  rows: TapeRow[];
  lastSeenAt: number | null;
  /** The reader's local date, ISO, for the "Today" label. */
  today: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const now = useMemo(() => Date.now(), []);
  const visible = showAll ? rows : rows.slice(0, INITIAL);

  // Where the previous visit ended: the index of the first row no newer
  // than then. Day-only rows carry their day's midnight, so a Korean filing
  // from today counts as seen if the reader was here today at all.
  const sinceCount =
    lastSeenAt == null ? 0 : rows.filter((r) => r.at > lastSeenAt).length;
  const markerAt =
    lastSeenAt == null ? -1 : visible.findIndex((r) => r.at <= lastSeenAt);
  const when = lastSeenAt == null ? "" : relative(lastSeenAt, now);

  return (
    <>
      <BoardRowHeader
        className="mt-6"
        facts={["Side", "Disclosed"]}
        lead="none"
        money="Size"
        perf="Verdict"
        subject="Company and insider"
      />

      {lastSeenAt != null && sinceCount === 0 ? (
        <p className="mt-2 text-[12px] text-foreground/50">
          Nothing new since you last looked, {when}.
        </p>
      ) : null}

      <BoardRowList>
        {visible.map((row, i) => {
          const prev = visible[i - 1];
          const newDay = !prev || prev.disclosedDate !== row.disclosedDate;
          const dayRows = newDay
            ? rows.filter((r) => r.disclosedDate === row.disclosedDate)
            : [];

          return (
            <Fragment key={row.key}>
              {markerAt === i && i > 0 ? (
                <SinceMarker count={sinceCount} when={when} />
              ) : null}
              {newDay ? (
                <DayRule iso={row.disclosedDate} rows={dayRows} today={today} />
              ) : null}
              <Row row={row} />
            </Fragment>
          );
        })}
        {/* The whole visible tape is newer than the last visit. */}
        {lastSeenAt != null &&
        markerAt === -1 &&
        sinceCount > 0 &&
        visible.length > 0 ? (
          <SinceMarker count={sinceCount} when={when} />
        ) : null}
      </BoardRowList>

      {!showAll && rows.length > INITIAL ? (
        <div className="mt-5 flex justify-center">
          <button
            className="rounded-lg bg-ink/[0.07] px-4 py-2 text-[13px] font-medium text-ink outline-none transition-colors hover:bg-ink/[0.12] focus-visible:ring-2 focus-visible:ring-brand-brown/40 dark:bg-white/10 dark:text-white dark:hover:bg-white/[0.16]"
            type="button"
            onClick={() => setShowAll(true)}
          >
            Show the rest of the tape, {rows.length - INITIAL} more
          </button>
        </div>
      ) : null}
    </>
  );
}
