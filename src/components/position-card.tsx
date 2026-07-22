/** Market-agnostic price formatting bundle. Each market supplies one of these
 *  so the component can render quote prices, domestic-currency values, and
 *  multiply quote units → domestic units (pence → GBP = 0.01, USD → USD = 1). */
export interface PriceFormat {
  formatPrice: (n: number) => string;
  formatValue: (n: number) => string;
  /** Compact headline variant of formatValue ("£2.1M", not "£2,067,389") for
   *  marketing surfaces like the discretion teaser. Falls back to formatValue
   *  when a market omits it. */
  formatValueCompact?: (n: number) => string;
  quoteToValue: number;
  /** Optional Tailwind width class for the Value column in market row tables.
   *  Defaults to `w-24` when omitted; SEK widens it to fit the currency prefix
   *  + larger digit counts. */
  valueColumnClass?: string;
}

export interface BenchmarkProps {
  /** Quote-unit price on the trade date. */
  entry: number | null;
  /** Quote-unit price now. */
  current: number | null;
  label: string;
}

/** The vs-benchmark result as a sentence, for the foot of the merged price
 *  card.
 *
 *  This used to be a fourth tile showing the benchmark's own return with a
 *  "+3.2pp alpha" sub-line — two more numbers in a card that already had
 *  six, and the one figure a reader actually wants (did this beat the
 *  market?) left as an inference. iOS made the same change: the verdict is
 *  a clause, and the magnitude follows it.
 */
export function BenchmarkVerdict({
  stockPct,
  benchmark,
  anchorDate,
  anchorLabel = "trade",
  muted = false,
}: {
  stockPct: number;
  benchmark: BenchmarkProps;
  /** ISO date the comparison is measured from — both legs share it. */
  anchorDate: string;
  /** What that date *is*, so the sentence stays true when the reader has
   *  switched the drawer to the disclosure anchor. */
  anchorLabel?: "trade" | "disclosure";
  muted?: boolean;
}) {
  if (benchmark.entry == null || benchmark.current == null) return null;

  const benchmarkPct = (benchmark.current - benchmark.entry) / benchmark.entry;
  const alphaPct = stockPct - benchmarkPct;
  const ahead = alphaPct >= 0;
  const when = new Date(anchorDate).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const upText = "text-[#1e6b18] dark:text-[#5cd84a]";
  const downText = "text-[#8b2020] dark:text-[#e84d4d]";

  // A non-open-market entry isn't a price anyone paid, so "outperformed"
  // would be claiming a result that wasn't earned. State the benchmark's
  // own move and stop there.
  if (muted) {
    return (
      <p className="text-xs leading-relaxed text-muted">
        The {benchmark.label} has moved{" "}
        <span className="tabular-nums">
          {benchmarkPct >= 0 ? "+" : ""}
          {(benchmarkPct * 100).toFixed(1)}%
        </span>{" "}
        since the {anchorLabel} on {when}.
      </p>
    );
  }

  return (
    <p className="text-xs leading-relaxed text-muted">
      Since the {anchorLabel} on {when}, this purchase has{" "}
      <span className={`font-semibold ${ahead ? upText : downText}`}>
        {ahead ? "outperformed" : "underperformed"}
      </span>{" "}
      the {benchmark.label} by{" "}
      <span
        className={`font-semibold tabular-nums ${ahead ? upText : downText}`}
      >
        {Math.abs(alphaPct * 100).toFixed(1)}pp
      </span>
      .
    </p>
  );
}

/** Position card: Entry / Now / Return.
 *  Generalised from the UK pence/GBP-flavoured component — every market
 *  feeds it through a PriceFormat bundle. Internal consistency heuristic
 *  (shares × entry vs originalValue) preserved from UK.
 *
 *  The benchmark is no longer a fourth tile: it reads as prose beneath the
 *  chart via `BenchmarkVerdict`, so the card stays three figures wide.
 */
export function PositionCard({
  entry,
  current,
  shares = 0,
  originalValue = 0,
  fmt,
  muted = false,
  hideAmounts = false,
}: {
  entry: number;
  current: number;
  shares?: number;
  originalValue?: number;
  fmt: PriceFormat;
  /** When true, the Now / Return cells render in neutral styling
   *  instead of buy-green / sell-red, and the Return tile drops its coloured
   *  fill. Used for non-open-market trades (awards, schemes, placings) where
   *  the % is real but the green "winner" framing would mislead — the director
   *  didn't buy at this price. Mirrors the iOS PositionCard `isMuted` flag. */
  muted?: boolean;
  /** When true, the per-tile cash sub-lines (consideration, current value,
   *  absolute gain) are hidden — the price + % numbers stay. For markets with
   *  no exact trade value or share count (Congress PTRs disclose only a band),
   *  where a derived cash figure would be made up. */
  hideAmounts?: boolean;
}) {
  const stockPct = (current - entry) / entry;
  const up = stockPct >= 0;
  // When shares × entry disagrees with originalValue the row is internally
  // inconsistent — either shares is wrong or value is. Without an independent
  // signal, pick whichever side produces a plausible director-disclosure trade
  // size in the security's domestic currency (5k–10M majors). Otherwise fall
  // back to the reported share count rather than guess. The same band works
  // for both UK (GBP, post the 5k disclosure floor) and US (USD).
  const computedFromShares = shares * entry * fmt.quoteToValue;
  const sharesRatio =
    computedFromShares > 0 && originalValue > 0
      ? Math.max(computedFromShares, originalValue) /
        Math.min(computedFromShares, originalValue)
      : 1;
  const plausible = (v: number) => v >= 5_000 && v <= 10_000_000;
  const effectiveShares =
    sharesRatio < 1.05 || entry <= 0 || originalValue <= 0
      ? shares
      : plausible(originalValue) && !plausible(computedFromShares)
        ? originalValue / (entry * fmt.quoteToValue)
        : shares;
  const currentValue = effectiveShares * current * fmt.quoteToValue;
  const gainLoss = currentValue - originalValue;
  const gainSign = gainLoss >= 0 ? "+" : "";

  const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${(n * 100).toFixed(1)}%`;

  const upText = "text-[#1e6b18] dark:text-[#5cd84a]";
  const downText = "text-[#8b2020] dark:text-[#e84d4d]";
  const upBg = "bg-[#1e6b18]/[0.12] dark:bg-[#5cd84a]/[0.12]";
  const downBg = "bg-[#8b2020]/[0.12] dark:bg-[#e84d4d]/[0.12]";
  const neutralBg = "bg-black/[0.04] dark:bg-white/[0.06]";

  // For non-open-market trades the % is real but green/red "winner" framing
  // would mislead — the director didn't buy at this price. Strip the colour
  // and the Return tile's coloured fill, keeping the numbers in neutral ink.
  const trendText = muted ? "text-foreground" : up ? upText : downText;
  const returnBg = muted ? neutralBg : up ? upBg : downBg;

  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
      <div className="rounded-xl bg-black/[0.04] dark:bg-white/[0.06] px-4 py-4">
        <div className="text-[10px] text-muted uppercase tracking-wider mb-2">
          Entry
        </div>
        <div className="text-2xl font-bold tabular-nums">
          {fmt.formatPrice(entry)}
        </div>
        {!hideAmounts && (
          <div className="text-xs text-muted mt-1">
            {fmt.formatValue(originalValue)}
          </div>
        )}
      </div>

      <div className="rounded-xl bg-black/[0.04] dark:bg-white/[0.06] px-4 py-4">
        <div className="text-[10px] text-muted uppercase tracking-wider mb-2">
          Now
        </div>
        <div className={`text-2xl font-bold tabular-nums ${trendText}`}>
          {fmt.formatPrice(current)}
        </div>
        {!hideAmounts && (
          <div className="text-xs text-muted mt-1">
            {fmt.formatValue(currentValue)}
          </div>
        )}
      </div>

      <div className={`rounded-xl px-4 py-4 ${returnBg}`}>
        <div className="text-[10px] text-muted uppercase tracking-wider mb-2">
          Return
        </div>
        <div
          className={`text-2xl font-bold tabular-nums ${muted ? "text-muted" : trendText}`}
        >
          {muted ? "N/A" : fmtPct(stockPct)}
        </div>
        {!muted && !hideAmounts && (
          <div className={`text-xs font-medium mt-1 opacity-70 ${trendText}`}>
            {gainSign}
            {fmt.formatValue(gainLoss)}
          </div>
        )}
      </div>
    </div>
  );
}
