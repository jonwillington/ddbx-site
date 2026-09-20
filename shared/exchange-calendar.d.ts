// Types for shared/exchange-calendar.js. See shared/seo.d.ts for why the
// module is plain ESM with its types declared alongside.

export type ClosureReason =
  | { kind: "weekend" }
  | { kind: "holiday"; name: string };

export declare const UK_CLOSURES: Record<string, string>;
export declare const US_CLOSURES: Record<string, string>;
export declare function isDateSlug(slug: string): boolean;
export declare function addDays(iso: string, days: number): string;
export declare function closureReason(
  iso: string,
  market: string,
): ClosureReason | null;
export declare function isTradingDay(iso: string, market: string): boolean;
export declare function prevTradingDay(
  iso: string,
  market: string,
): string | null;
export declare function nextTradingDay(
  iso: string,
  market: string,
): string | null;
export declare function tradingDaysBetween(
  from: string,
  to: string,
  market: string,
): string[];
