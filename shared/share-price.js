// A share price, as a record page states one. Plain ESM so node:test can
// reach it (tests/share-price.test.mjs); types in share-price.d.ts.

const SYMBOL = { GBP: "£", USD: "$", EUR: "€" };

/** Format a share price given in MAJOR units (pounds, dollars).
 *
 *  Two places from 0.1 up to 1,000 ("£0.41", "$12.56"); four below 0.1, since
 *  sub-penny AIM lines are real (ARK trades at £0.0075); whole units from
 *  1,000 up. Floats are rounded here, never printed raw: a stats field read
 *  as `${sym}${value}` put "0.40700000000000003" on a company page.
 *
 *  `currency` takes Yahoo's spellings: LSE lines arrive as "GBp", but
 *  ddbx-data has already divided those price fields by 100 into pounds
 *  (worker/pipeline/yahoo-stats.ts), so "GBp" means the pound's symbol and no
 *  further scaling. Returns "" for a missing or non-finite price — say so in
 *  words at the call site rather than print a placeholder figure. */
export function sharePrice(major, currency) {
  if (major == null) return "";
  const n = Number(major);

  if (!Number.isFinite(n)) return "";
  const sym = SYMBOL[String(currency ?? "").toUpperCase()] ?? "";
  const abs = Math.abs(n);
  const dp = abs < 0.1 ? 4 : abs < 1000 ? 2 : 0;

  return `${sym}${n.toFixed(dp)}`;
}
