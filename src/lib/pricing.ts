// Subscription pricing shown on the app-install landing pages.
//
// ⚠ SOURCE OF TRUTH IS APP STORE CONNECT / PLAY CONSOLE, not this file. These
// values are mirrored by hand from `ddbx-ios-app/Subscriptions.storekit`
// (products `app.ddbx.{annual,monthly}` for UK, `us.ddbx.app.premium.*` for
// US), which is a LOCAL StoreKit test config on the USA storefront — the live
// per-territory prices can differ from it. Confirm against the store listings
// before treating a number here as gospel, and re-check whenever a price
// changes: this is the only place on the public web where we state a price,
// so a stale value here is a stale value everywhere.
//
// The trial length is the products' introductory offer (P1W = 7 days) and
// matches the "7-day free trial" copy already used across the hero and CTAs.

export interface MarketPricing {
  /** Currency symbol as it prefixes the amount, e.g. "£". */
  symbol: string;
  /** ISO code, for the a11y label and the annual-saving sentence. */
  code: string;
  monthly: number;
  annual: number;
  trialDays: number;
}

export const PRICING: Record<"uk" | "us", MarketPricing> = {
  uk: { symbol: "£", code: "GBP", monthly: 9.99, annual: 39.99, trialDays: 7 },
  us: { symbol: "$", code: "USD", monthly: 9.99, annual: 39.99, trialDays: 7 },
};

/** The annual plan expressed as a per-month figure — the number that makes the
 *  annual tier obviously the better deal without any "save X%" mental maths. */
export function annualPerMonth(p: MarketPricing): number {
  return p.annual / 12;
}

/** Whole-percent saving of annual vs 12× monthly, rounded down so we never
 *  overstate it. */
export function annualSavingPct(p: MarketPricing): number {
  return Math.floor((1 - p.annual / (p.monthly * 12)) * 100);
}

/** `£9.99` / `£3.33` — two decimals unless the amount is whole. */
export function formatPrice(p: MarketPricing, amount: number): string {
  return `${p.symbol}${amount.toFixed(2)}`;
}
