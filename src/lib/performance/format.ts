// Shared presentation formatters for the performance + monthly-recap surfaces.
// Dependency-free so both the pure compute layer and React components can use
// them. Returns are ratios (0.12 = +12%); money is £ major units.

/** "+12.0%" / "−4.3%" / "0.0%" from a ratio (0.12 → "+12.0%"). Non-finite → "—". */
export function formatSignedPct(ratio: number | null | undefined): string {
  if (ratio == null || !Number.isFinite(ratio)) return "—";
  const pct = ratio * 100;
  const sign = pct > 0 ? "+" : pct < 0 ? "−" : "";

  return `${sign}${Math.abs(pct).toFixed(1)}%`;
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
