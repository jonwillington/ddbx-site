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
  // Loop rather than strip once: names routinely carry TWO trailing
  // parentheticals — "Jardine Matheson Holdings Ltd (Singapore Reg) (JAR)" —
  // and a single pass removed only the ticker, leaving a name long enough to
  // blow out a leaderboard row. Bounded by the fact that each pass must shorten
  // the string.
  let out = String(name ?? "").trim();

  for (;;) {
    const next = out
      .replace(/\s*\([^)]*\)\s*$/, "")
      .replace(/\s*\/[A-Z]{2}\/\s*$/, "")
      .trim();

    // Never strip the whole name away: a company literally called "(BLANK)"
    // should render as it arrived rather than as an empty cell.
    if (next === out || next === "") return out;
    out = next;
  }
}

/** Insider names as filed, cut back to something that fits a row.
 *
 *  UK RNS gives the beneficial-ownership chain in full — "1947 Trustee Limited
 *  (trustee for 1947 Trust benefiting Executive Directors)" — which is correct,
 *  legally meaningful, and three times the width of the row it has to sit in.
 *  The parenthetical is the part that explains the relationship rather than
 *  names the actor, so it goes; the drawer and the company page still show the
 *  filed string in full. */
export function cleanInsiderName(name: string): string {
  const out = String(name ?? "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim();

  return out || String(name ?? "").trim();
}

/** Ticker as displayed — no exchange suffix. */
export function displayTicker(key: string): string {
  return String(key ?? "").replace(/\.L$/i, "");
}
