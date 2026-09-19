// Shared presentation formatters for the performance + monthly-recap surfaces.
// Dependency-free so both the pure compute layer and React components can use
// them. Returns are ratios (0.12 = +12%); money is £ major units.

/** "+12.0%" / "−4.3%" / "0.0%" from a ratio (0.12 → "+12.0%"). Non-finite → "—". */
export function formatSignedPct(ratio: number | null | undefined): string {
  if (ratio == null || !Number.isFinite(ratio)) return "—";

  return formatSigned(ratio * 100);
}

/** The house signed-figure format, from a value already in display units
 *  (12.4 → "+12.4%"). Real minus glyph for negatives, "+" for positives, and
 *  no sign on a figure that rounds to zero at the chosen precision — "+0.0%"
 *  claims a rise the number says didn't happen. Callers guard non-finite
 *  input; `<Delta>` (components/ui/delta.tsx) is the rendered form. */
export function formatSigned(
  value: number,
  opts: { decimals?: number; suffix?: string; showSign?: boolean } = {},
): string {
  const { decimals = 1, suffix = "%", showSign = true } = opts;
  const dir = signedDirection(value, decimals);
  const sign = !showSign || dir === 0 ? "" : dir > 0 ? "+" : "−";

  return `${sign}${Math.abs(value).toFixed(decimals)}${suffix}`;
}

/** −1 / 0 / 1 for a figure as `formatSigned` prints it — so the ink and the
 *  sign can never disagree on a value that rounds to zero. */
export function signedDirection(value: number, decimals = 1): -1 | 0 | 1 {
  if (Number(Math.abs(value).toFixed(decimals)) === 0) return 0;

  return value > 0 ? 1 : -1;
}

/** "£1,234" or, when `compact`, "£1.2k" / "£3.4m". Negative uses the real
 *  minus glyph to match the rest of the performance UI. Non-finite → "—". */
export function formatGbp(
  value: number | null | undefined,
  opts: { compact?: boolean } = {},
): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";

  if (opts.compact) {
    if (abs >= 1_000_000) return `${sign}£${(abs / 1_000_000).toFixed(1)}m`;
    if (abs >= 1_000) return `${sign}£${(abs / 1_000).toFixed(1)}k`;
  }

  return `${sign}£${Math.round(abs).toLocaleString("en-GB")}`;
}
