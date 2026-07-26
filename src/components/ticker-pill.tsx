/** The mono ticker chip.
 *
 *  Promoted out of `market-row.tsx`, where the same four classes were inlined
 *  at every row variant. It's one of the handful of marks that makes a surface
 *  read as ddbx rather than as a generic table, so the SEO pages want it too —
 *  and a ticker set in plain grey text beside a company name (which is what
 *  those pages were doing) reads as a suffix rather than as an identifier. */
export function TickerPill({
  ticker,
  className = "",
}: {
  ticker: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-block shrink-0 rounded bg-[#e8e0d5] px-1.5 font-mono text-[11px] font-semibold tabular-nums text-foreground/70 dark:bg-surface-secondary ${className}`}
    >
      {ticker}
    </span>
  );
}
