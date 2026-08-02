/** The site's date object: a torn-off calendar leaf with a coloured weekday
 *  band over a large day number.
 *
 *  Lifted out of `market/market-row.tsx`, where it was private, when the filing
 *  pages needed the same object. It is the treatment a reader already
 *  associates with a date on this site — the deals list is built on a column of
 *  them — so a filing page writing "· 29 Jun" in grey was inventing a second,
 *  weaker way to say the same thing.
 *
 *  `sm` is the list-row size; `md` the day-header size; `lg` exists for the
 *  cluster timeline, where the chip is the thing being pointed at rather than a
 *  marker beside something else.
 */

const WIDTH = { sm: "w-9", md: "w-10", lg: "w-12" } as const;
const BAND = {
  sm: "py-[2px] text-[7px]",
  md: "py-[2px] text-[8px]",
  lg: "py-[3px] text-[9px]",
} as const;
const NUM = {
  sm: "py-1 text-base",
  md: "py-1 text-base",
  lg: "py-1.5 text-[19px]",
} as const;

export function CalendarDayChip({
  weekday,
  dayNum,
  size = "md",
  /** Mutes the band for a day that is context rather than the subject — the
   *  other purchases in a cluster, against the one the page is about. */
  muted = false,
  className = "",
}: {
  weekday: string;
  dayNum: string;
  size?: "sm" | "md" | "lg";
  muted?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`flex shrink-0 flex-col overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-surface-secondary ${WIDTH[size]} ${className}`}
    >
      <span
        className={`text-center font-bold uppercase tracking-[0.08em] ${BAND[size]} ${
          muted
            ? "bg-foreground/15 text-foreground/60"
            : "bg-brand-brown text-[#f5f0e8] dark:bg-brand-tan dark:text-ink"
        }`}
      >
        {weekday.slice(0, 3)}
      </span>
      <span
        className={`text-center font-semibold leading-none tabular-nums text-foreground/90 ${NUM[size]}`}
      >
        {dayNum}
      </span>
    </span>
  );
}

/** ISO date -> the two strings the chip wants. UTC throughout: filing dates are
 *  calendar dates with no time, and letting the local zone interpret them moves
 *  a purchase to the previous day for anyone west of London. */
export function chipParts(iso: string, locale = "en-GB") {
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);

  if (Number.isNaN(d.getTime())) return { weekday: "", dayNum: "" };

  return {
    weekday: d.toLocaleDateString(locale, {
      weekday: "short",
      timeZone: "UTC",
    }),
    dayNum: String(d.getUTCDate()),
  };
}
