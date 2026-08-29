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
// matches the "Free for 7 days, cancel any time." copy used across the CTAs.

export interface MarketPricing {
  /** Currency symbol as it prefixes the amount, e.g. "£". */
  symbol: string;
  /** ISO code, for the a11y label and the annual-saving sentence. */
  code: string;
  monthly: number;
  annual: number;
  trialDays: number;
  /** True when the figures above are a limited-time promotion rather than the
   *  standing price. Every surface that states a number checks this and says
   *  so — a promotional price presented as the permanent one is the kind of
   *  thing a reader finds out at the checkout sheet, which is exactly where
   *  trust is lost. Clear it when the promotion ends and the copy follows. */
  promotional?: boolean;
}

export const PRICING: Record<"uk" | "us", MarketPricing> = {
  // UK is on a limited-time promotion from 2026-08-29: £0.99/month or £4.99
  // for the year, after the 7-day trial. Confirm against App Store Connect
  // before changing either number.
  uk: {
    symbol: "£",
    code: "GBP",
    monthly: 0.99,
    annual: 4.99,
    trialDays: 7,
    promotional: true,
  },
  us: { symbol: "$", code: "USD", monthly: 9.99, annual: 39.99, trialDays: 7 },
};

/** The standing phrase for promotional pricing. One string so the site cannot
 *  describe the same promotion three ways. */
export const PROMO_NOTE = "Limited-time price";

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
