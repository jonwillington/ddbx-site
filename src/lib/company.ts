// Company-page URL and naming helpers.
//
// Public URLs are deliberately shorter than the storage keys: the market comes
// from the domain (ddbx.uk serves UK issuers, ddbx.us serves US ones) and the
// LSE `.L` suffix is dropped, so `MTLN.L` on the UK market is
// ddbx.uk/company/mtln. The API still speaks in storage keys, so every
// conversion goes through here.
//
// functions/company/[key].js mirrors these two functions for the crawler
// pre-render. If you change the URL shape, change it there too.

/** Storage key → URL slug. "MTLN.L" -> "mtln", "FCNCA" -> "fcnca". */
export function tickerToSlug(key: string): string {
  return String(key ?? "")
    .replace(/\.L$/i, "")
    .toLowerCase();
}

/** URL slug → storage key. UK tickers are stored with the `.L` suffix the LSE
 *  uses; US ones are bare. */
export function slugToKey(slug: string, market: string): string {
  const bare = String(slug ?? "").toUpperCase();

  if (market !== "UK") return bare;

  return bare.endsWith(".L") ? bare : `${bare}.L`;
}

/** Path to a company page on its own market's domain. */
export function companyPath(key: string): string {
  return `/company/${tickerToSlug(key)}`;
}

/** Display name, cleaned of the noise each source appends.
 *
 *  "Metlen Energy & Metals PLC (MTLN)"  -> "Metlen Energy & Metals PLC"
 *  "FIRST CITIZENS BANCSHARES INC /DE/" -> "FIRST CITIZENS BANCSHARES INC"
 *
 *  Casing is left alone on purpose: US filings arrive in caps, and
 *  title-casing them would mangle AT&T, NVIDIA and every other acronym. */
export function cleanCompanyName(name: string): string {
  return String(name ?? "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .replace(/\s*\/[A-Z]{2}\/\s*$/, "")
    .trim();
}

/** Ticker as displayed — no exchange suffix. */
export function displayTicker(key: string): string {
  return String(key ?? "").replace(/\.L$/i, "");
}
