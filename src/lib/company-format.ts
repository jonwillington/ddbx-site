/** Currency and locale formatting shared by the company-page surfaces.
 *
 *  The symbol map and the short-money formatter had been copy-pasted into
 *  three files (the page, the pitch band, the price chart), so a new currency
 *  or a changed abbreviation had to be applied in three places to keep one
 *  page self-consistent.
 */

export const SYMBOL: Record<string, string> = { GBP: "£", USD: "$", EUR: "€" };

/** Number/date locale for a market id ("UK" | "US"). */
export const localeFor = (market: string) =>
  market === "US" ? "en-US" : "en-GB";

export function moneyShort(
  value: number | null | undefined,
  currency = "GBP",
): string {
  const n = Number(value);

  if (!isFinite(n) || n === 0) return "—";
  const sym = SYMBOL[currency] ?? "";

  if (n >= 1_000_000) {
    const m = n / 1_000_000;

    return `${sym}${m >= 10 ? Math.round(m) : m.toFixed(1).replace(/\.0$/, "")}m`;
  }
  if (n >= 1_000) return `${sym}${Math.round(n / 1_000)}k`;

  return `${sym}${Math.round(n)}`;
}
